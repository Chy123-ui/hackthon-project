"""API 路由 -- Agent 协议 + Tape 上下文管理"""
import json
import io
import re
import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..core.config import settings
from ..core.prompt_engine import PromptEngine
from ..core.llm_client import LLMClient
from ..core.session import SessionManager
from ..core.encrypt_config import encrypt_api_key, decrypt_config
from ..core.tape import assemble_messages, compress_session
from ..core.token_counter import count_messages
from ..core.model_info import fetch_model_max_tokens
from ..models.game import (
    NewGameRequest,
    NewGameResponse,
    GameAction,
    ConfigUpdate,
)

router = APIRouter(prefix="/api")
prompt_engine = PromptEngine()
session_manager = SessionManager()
llm_client = LLMClient()

CONFIG_PATH = settings.data_dir / "config.json"


def _load_server_config() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return decrypt_config(json.load(f))
    return {}


def _save_server_config(config: dict) -> None:
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(encrypt_api_key(config), f, ensure_ascii=False, indent=2)


def _apply_config(config: dict) -> None:
    if "api_key" in config:
        settings.api_key = config["api_key"]
    if "base_url" in config:
        settings.base_url = config["base_url"]
        llm_client._client = None
    if "model" in config:
        settings.model = config["model"]
    if "max_tokens" in config:
        settings.max_tokens = config["max_tokens"]
    if "temperature" in config:
        settings.temperature = config["temperature"]


_apply_config(_load_server_config())


def _tag_key_node(messages: list[dict], turn: int, key_summary: str) -> None:
    if messages and turn > 0:
        idx = turn * 2 - 1
        if idx < len(messages) and messages[idx].get("role") == "assistant":
            messages[idx]["tape"] = "key"
            messages[idx]["key_summary"] = key_summary


def _build_and_tag(session: dict, raw_reply: str) -> dict:
    parsed = prompt_engine.parse_response(raw_reply)
    if parsed.get("key_node_summary"):
        _tag_key_node(session["messages"], session["turn"], parsed["key_node_summary"])
    return parsed


# ---- Config ----

@router.get("/config")
async def get_config():
    return _load_server_config()


@router.put("/config")
async def update_config(body: ConfigUpdate):
    config = _load_server_config()
    update_data = body.model_dump(exclude_none=True)
    config.update(update_data)
    _save_server_config(config)
    _apply_config(config)
    if settings.api_key and settings.model:
        try:
            max_tok = await fetch_model_max_tokens()
            settings.context_limit = max_tok
        except Exception:
            pass
    return {"status": "ok"}


# ---- Templates: Core (locked) ----

@router.get("/templates/core/protocol")
async def get_protocol():
    return {"protocol": prompt_engine.load_protocol()}


@router.get("/templates/core/safety")
async def get_safety():
    return {"rules": prompt_engine.load_safety()}


# ---- Templates: World files (user-editable) ----

@router.get("/templates")
async def list_templates():
    worlds = prompt_engine.list_worlds()
    return {"worlds": worlds}


@router.get("/templates/{world}/world")
async def get_world_template(world: str):
    data = prompt_engine.load_world(world)
    if data is None:
        raise HTTPException(status_code=404, detail=f"World '{world}' not found")
    return data


@router.put("/templates/{world}/world")
async def update_world_template(world: str, body: dict):
    prompt_engine.save_world(world, body)
    return {"status": "ok"}


@router.get("/templates/{world}/player")
async def get_player_template(world: str):
    data = prompt_engine.load_player(world)
    return data or {}


@router.put("/templates/{world}/player")
async def update_player_template(world: str, body: dict):
    prompt_engine.save_player(world, body)
    return {"status": "ok"}


@router.get("/templates/{world}/preferences")
async def get_preferences_template(world: str):
    data = prompt_engine.load_preferences(world)
    return data or {}


@router.put("/templates/{world}/preferences")
async def update_preferences_template(world: str, body: dict):
    prompt_engine.save_preferences(world, body)
    return {"status": "ok"}


@router.delete("/templates/{world}")
async def delete_world_template(world: str):
    if prompt_engine.delete_world(world):
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail=f"World '{world}' not found")


@router.get("/templates/{world}/preview")
async def preview_system_prompt(world: str):
    prompt = prompt_engine.render_system_prompt(world, "预览角色名")
    return {"preview": prompt}


# ---- Templates: Export / Import ----

@router.get("/templates/{world}/export")
async def export_world(world: str):
    world_data = prompt_engine.load_world(world)
    player_data = prompt_engine.load_player(world)
    prefs_data = prompt_engine.load_preferences(world)
    if world_data is None:
        raise HTTPException(status_code=404, detail=f"World '{world}' not found")
    return {
        "world": world_data,
        "player": player_data or {},
        "preferences": prefs_data or {},
    }


IMPORT_PROMPT = """你是一个游戏世界观文件解析器。下面是用户上传的文件内容。
如果是结构化的 YAML 格式，直接输出优化后的 YAML。
如果是纯文本故事描述，提取其中的世界设定生成 YAML 格式。

 请输出三个 YAML 块（world.yaml / player.yaml / preferences.yaml）。
 name, description, starting_scene 等基础字段必须存在，但你可以自由添加额外字段。

```yaml
# world.yaml
name: 世界名称（使用中文，如 "赛博东京"）
description: |
  世界观描述
starting_scene: |
  {{player_name}}开场场景
```

```yaml
# player.yaml
name: 角色名
description: 简介
background: |
  背景故事
```

```yaml
# preferences.yaml
narrative_style: |
  叙事风格
tone: 语调
pacing: 节奏
detail_level: 细节程度
```

文件内容：
{content}"""


MODIFY_PROMPT = """你是一个游戏世界观编辑助手。下面是当前游戏世界的模板文件。
用户有一项修改需求，请根据需求修改模板并在新的世界名中体现修改。
返回修改后完整的三个 YAML 块。基础字段必须保留，你可以自由调整或添加额外字段。

修改需求：{instruction}

当前世界名：{world_name}

```yaml
# world.yaml
{world_content}
```

```yaml
# player.yaml
{player_content}
```

```yaml
# preferences.yaml
{prefs_content}
```

请直接输出修改后的完整 YAML，可以添加额外字段，不要加解释。"""


@router.post("/templates/{world}/modify")
async def modify_world(world: str, body: dict):
    instruction = body.get("instruction", "").strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Instruction required")

    world_data = prompt_engine.load_world(world)
    if world_data is None:
        raise HTTPException(status_code=404, detail=f"World '{world}' not found")
    player_data = prompt_engine.load_player(world) or {}
    prefs_data = prompt_engine.load_preferences(world) or {}

    world_yaml = yaml.dump(world_data, allow_unicode=True)
    player_yaml = yaml.dump(player_data, allow_unicode=True)
    prefs_yaml = yaml.dump(prefs_data, allow_unicode=True)

    prompt = MODIFY_PROMPT.format(
        instruction=instruction,
        world_name=world_data.get("name", world),
        world_content=world_yaml,
        player_content=player_yaml,
        prefs_content=prefs_yaml,
    )

    try:
        result = await llm_client.chat([{"role": "user", "content": prompt}])
        raw = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    world_name, files = _parse_world_gen(raw, f"modified_{world}")
    if world_name is None:
        raise HTTPException(status_code=500, detail="Failed to parse modified output")

    for filename, content in files.items():
        path = settings.worlds_dir / world_name / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    return {"world": world_name, "files": list(files.keys())}


@router.get("/templates/{world}/modify-suggestions")
async def get_modify_suggestions(world: str):
    world_data = prompt_engine.load_world(world)
    player_data = prompt_engine.load_player(world)
    prefs_data = prompt_engine.load_preferences(world)
    if world_data is None:
        raise HTTPException(status_code=404, detail=f"World '{world}' not found")

    summary = f"World name: {world_data.get('name', world)}\n"
    summary += f"Description: {world_data.get('description', '')[:300]}\n"
    summary += f"Player: {player_data.get('name', '')} - {player_data.get('background', '')[:100]}"
    summary += f"Tone: {prefs_data.get('tone', '')}"

    try:
        result = await llm_client.chat([{
            "role": "user",
            "content": f"You are a creative writing assistant. Given this world template summary:\n{summary}\n\nSuggest 5 specific, diverse modification ideas for this world. Return them as a comma-separated list only, no other text."
        }])
        raw = result["choices"][0]["message"]["content"]
        suggestions = [s.strip() for s in raw.split(",") if s.strip()]
        return {"suggestions": suggestions[:5]}
    except Exception as e:
        return {"suggestions": []}


def _parse_json_export(content: str) -> dict | None:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or "world" not in data:
        return None
    w = data["world"]
    name = (w.get("name") or "imported").strip()
    if not name:
        return None
    world_name = re.sub(r"[^a-z0-9_]", "_", name.lower())[:30]
    files = {}
    files["world.yaml"] = yaml.dump(data["world"], allow_unicode=True)
    if "player" in data:
        files["player.yaml"] = yaml.dump(data["player"], allow_unicode=True)
    if "preferences" in data:
        files["preferences.yaml"] = yaml.dump(data["preferences"], allow_unicode=True)
    return {"name": world_name, "files": files}


def _extract_docx(raw: bytes) -> str:
    import zipfile
    import xml.etree.ElementTree as ET
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            if "word/document.xml" not in z.namelist():
                return ""
            xml = z.read("word/document.xml")
            root = ET.fromstring(xml)
            ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            paragraphs = []
            for p in root.iter(f"{{{ns}}}p"):
                texts = [t.text or "" for t in p.iter(f"{{{ns}}}t")]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception:
        return ""


def _extract_doc(raw: bytes) -> str:
    text = raw.decode("utf-8", errors="ignore")
    text = re.sub(r"[^\x20-\x7e\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n]", "", text)
    lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 5]
    return "\n".join(lines)


@router.post("/templates/import")
async def import_world(body: dict):
    content = body.get("content", "").strip()
    filename = body.get("filename", "imported.txt").strip()
    is_binary = body.get("binary", False)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed = {"txt", "json", "yaml", "yml", "md", "docx", "doc"}
    if is_binary and ext not in {"docx", "doc"}:
        raise HTTPException(status_code=400, detail=f"Unsupported format: .{ext}")
    if not is_binary and ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported format: .{ext}")

    if is_binary:
        import base64
        raw = base64.b64decode(content)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "docx":
            content = _extract_docx(raw)
        elif ext == "doc":
            content = _extract_doc(raw)
        else:
            content = raw.decode("utf-8", errors="ignore")

    if not content.strip():
        raise HTTPException(status_code=400, detail="No parseable content")

    parsed_json = _parse_json_export(content)
    if parsed_json:
        _save_world_files(parsed_json["name"], parsed_json["files"])
        return {"world": parsed_json["name"], "files": list(parsed_json["files"].keys()), "source": "json"}

    detected_name = re.search(r"^name:\s*(\S+)", content, re.MULTILINE)

    if detected_name:
        files = _parse_yaml_files(content)
        if files and "world" in files:
            wname = re.sub(r"[^a-z0-9_]", "_", detected_name.group(1).lower())[:30]
            _save_world_files(wname, files)
            return {"world": wname, "files": list(files.keys()), "source": "parsed"}

    try:
        result = await llm_client.chat([
            {"role": "user", "content": IMPORT_PROMPT.format(content=content[:8000])}
        ])
        raw = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    world_name, files = _parse_world_gen(raw, _basename(filename))
    if world_name is None:
        raise HTTPException(status_code=500, detail="Failed to parse imported content")

    _save_world_files(world_name, files)
    return {"world": world_name, "files": list(files.keys()), "source": "ai_parsed"}


def _parse_yaml_files(text: str) -> dict | None:
    sections = {}
    current_file = None
    current_lines = []
    for line in text.split("\n"):
        m = re.match(r"^#\s*(world|player|preferences)\.yaml", line)
        if m:
            if current_file:
                sections[current_file] = "\n".join(current_lines).strip()
            current_file = m.group(1)
            current_lines = []
            continue
        if current_file:
            current_lines.append(line)
    if current_file and current_lines:
        sections[current_file] = "\n".join(current_lines).strip()
    return sections if "world" in sections else None


def _save_world_files(world_name: str, files: dict) -> None:
    for filename, content in files.items():
        path = settings.worlds_dir / world_name / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)


def _basename(filename: str) -> str:
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    return _sanitize_name(name)


# ---- Templates: AI Generate ----

WORLD_GEN_PROMPT = """你是一个游戏世界观设计师。根据用户提供的概念，生成一套完整的文字冒险游戏设定。

请输出三个 YAML 块（world.yaml / player.yaml / preferences.yaml）。
name, description, starting_scene 等基础字段必须存在，但你可以自由添加额外字段
（如 magic_system, factions, calendar 等），它们会被注入系统提示词。

```yaml
# world.yaml
name: 世界名称（中文，如 "赛博朋克东京"）
description: |
  详细的世界观描述，包括地理、历史、势力、种族等
starting_scene: |
  {{player_name}}的冒险开场场景描述，用第二人称叙述
```

```yaml
# player.yaml
name: 默认角色名
description: 角色简介
background: |
  角色背景故事
```

```yaml
# preferences.yaml
narrative_style: |
  该世界的叙事风格建议
tone: 叙事语调
pacing: 叙事节奏
detail_level: 细节程度偏好
```

用户概念：{concept}"""


@router.post("/templates/new")
async def generate_world(body: dict):
    concept = body.get("concept", "").strip()
    if not concept:
        raise HTTPException(status_code=400, detail="Concept is required")
    try:
        result = await llm_client.chat([
            {"role": "user", "content": WORLD_GEN_PROMPT.format(concept=concept)}
        ])
        raw = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")
    world_name, world_files = _parse_world_gen(raw, concept)
    if world_name is None:
        raise HTTPException(status_code=500, detail="Failed to parse AI output")
    for filename, content in world_files.items():
        path = settings.worlds_dir / world_name / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    return {"world": world_name, "files": list(world_files.keys())}


def _parse_world_gen(raw: str, concept: str):
    sections = {}
    current_file = None
    current_lines = []
    for line in raw.split("\n"):
        if re.match(r"^```yaml\s*$", line):
            continue
        if line.startswith("```"):
            if current_file:
                sections[current_file] = "\n".join(current_lines).strip()
            current_file = None
            current_lines = []
            continue
        if re.match(r"^# (world|player|preferences)\.yaml$", line):
            if current_file:
                sections[current_file] = "\n".join(current_lines).strip()
            current_file = line[2:].removesuffix(".yaml").strip()
            current_lines = []
            continue
        if current_file:
            current_lines.append(line)
    if current_file and current_lines:
        sections[current_file] = "\n".join(current_lines).strip()
    if "world" not in sections:
        return _fallback_parse(raw, concept)
    world_yaml = sections["world"]
    player_yaml = sections.get("player", "name: 冒险者\ndescription: 一位冒险者\nbackground: 普通出身")
    prefs_yaml = sections.get("preferences", f"narrative_style: 生动的叙事风格\ntone: 适合{concept}的语调\npacing: 适中\ndetail_level: 适中")
    world_name = _extract_name(world_yaml, concept)
    return world_name, {"world.yaml": world_yaml, "player.yaml": player_yaml, "preferences.yaml": prefs_yaml}


def _extract_name(yaml_str: str, fallback: str) -> str:
    m = re.search(r"^name:\s*(\S+)", yaml_str, re.MULTILINE)
    if m:
        name = m.group(1).strip().strip('"\'')
        name = re.sub(r"[\/\\:*?\"<>|]", "", name)
        return name[:30] if name else _sanitize_name(fallback)
    return _sanitize_name(fallback)


def _sanitize_name(name: str) -> str:
    return re.sub(r"[\/\\:*?\"<>|]", "", name.strip())[:30]


def _fallback_parse(raw: str, concept: str):
    wname = _sanitize_name(concept)
    safe = concept.replace('"', "'")
    return wname, {
        "world.yaml": f"name: {safe}\ndescription: |\n  这是一个以「{safe}」为主题的世界。\n\nstarting_scene: |\n  {{player_name}}睁开双眼，发现自己正处在一个陌生的环境中。",
        "player.yaml": "name: 冒险者\ndescription: 一位来到这个世界的冒险者\nbackground: 怀着对未知的好奇，踏入了这个世界的门槛",
        "preferences.yaml": "narrative_style: |\n  生动的叙事风格，注重环境描写。\ntone: 认真与轻松并存\npacing: 适中\ndetail_level: 丰富",
    }


# ---- Game ----

@router.post("/game/new", response_model=NewGameResponse)
async def new_game(body: NewGameRequest):
    game_id = session_manager.create(body.world, body.player_name)
    return NewGameResponse(game_id=game_id, world=body.world, player_name=body.player_name)


@router.post("/game/{game_id}/start")
async def start_game(game_id: str):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["messages"]:
        return {"status": "already_started"}
    game_state = session.get("game_state", {})
    system_prompt = prompt_engine.render_system_prompt(session["world"], session["player_name"], game_state)
    first_scene = prompt_engine.render_first_message(session["world"], session["player_name"])
    starter = f"{system_prompt}\n\n现在开始游戏。玩家当前场景参考：{first_scene[:100]}..."
    if "首先，请为这个场景开场" not in starter:
        starter += "\n请以生动叙事开场，不要重复上述场景参考的原文。"
    messages = [{"role": "system", "content": starter}, {"role": "user", "content": "(游戏开始)"}]
    try:
        result = await llm_client.chat(messages)
        raw_reply = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")
    session["messages"].append({"role": "user", "content": "(游戏开始)", "tape": "normal"})
    session["messages"].append({"role": "assistant", "content": raw_reply, "tape": "normal"})
    session["turn"] = 1
    parsed = _build_and_tag(session, raw_reply)
    if parsed["state_updates"]:
        session["game_state"] = prompt_engine.apply_state_updates(game_state, parsed["state_updates"])
    if parsed["suggestions"]:
        session["suggestions"] = parsed["suggestions"]
    session_manager.save(game_id, session)
    return {
        "content": parsed["narrate"] or raw_reply,
        "thought": parsed["thought"],
        "suggestions": parsed["suggestions"],
        "state": session["game_state"],
        "turn": 1,
    }


@router.post("/game/{game_id}/action")
async def game_action(game_id: str, body: GameAction):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    game_state = session.get("game_state", {})
    system_prompt = prompt_engine.render_system_prompt(session["world"], session["player_name"], game_state)
    messages = assemble_messages(session, system_prompt, settings.context_limit, body.action)
    try:
        result = await llm_client.chat(messages)
        raw_reply = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")
    session["messages"].append({"role": "user", "content": body.action, "tape": "normal"})
    session["messages"].append({"role": "assistant", "content": raw_reply, "tape": "normal"})
    session["turn"] += 1
    parsed = _build_and_tag(session, raw_reply)
    if parsed["state_updates"]:
        session["game_state"] = prompt_engine.apply_state_updates(game_state, parsed["state_updates"])
    if parsed["suggestions"]:
        session["suggestions"] = parsed["suggestions"]
    session_manager.save(game_id, session)
    return {
        "content": parsed["narrate"] or raw_reply,
        "thought": parsed["thought"],
        "suggestions": parsed["suggestions"],
        "state": session["game_state"],
        "turn": session["turn"],
    }


@router.post("/game/{game_id}/action/stream")
async def game_action_stream(game_id: str, body: GameAction):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    game_state = session.get("game_state", {})
    system_prompt = prompt_engine.render_system_prompt(session["world"], session["player_name"], game_state)
    messages = assemble_messages(session, system_prompt, settings.context_limit, body.action)

    async def stream_response():
        full_reply = ""
        try:
            async for chunk in llm_client.chat_stream(messages):
                full_reply += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if full_reply:
                truncated = "</narrate>" not in full_reply
                tape_tag = "truncated" if truncated else "normal"
                session["messages"].append({"role": "user", "content": body.action, "tape": "normal"})
                session["messages"].append({"role": "assistant", "content": full_reply, "tape": tape_tag})
                session["turn"] += 1
                parsed = _build_and_tag(session, full_reply)
                if parsed["state_updates"]:
                    session["game_state"] = prompt_engine.apply_state_updates(game_state, parsed["state_updates"])
                if parsed["suggestions"]:
                    session["suggestions"] = parsed["suggestions"]
                session_manager.save(game_id, session)
                yield f"data: {json.dumps({'parsed': {'suggestions': parsed['suggestions'], 'state': session['game_state']}})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/game/{game_id}/history")
async def game_history(game_id: str):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/game/{game_id}")
async def delete_game(game_id: str):
    if not session_manager.delete(game_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}


@router.get("/games")
async def list_games():
    return session_manager.list_sessions()


@router.get("/game/{game_id}/tokens")
async def game_tokens(game_id: str):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    system_prompt = prompt_engine.render_system_prompt(session["world"], session["player_name"], session.get("game_state", {}))
    msgs = assemble_messages(session, system_prompt, settings.context_limit)
    used = count_messages(msgs)
    return {"used": used, "budget": settings.context_limit, "percent": round(used / max(settings.context_limit, 1) * 100, 1)}
