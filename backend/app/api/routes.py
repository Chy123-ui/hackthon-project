"""API 路由 -- Agent 协议 + 状态管理"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..core.config import settings
from ..core.prompt_engine import PromptEngine
from ..core.llm_client import LLMClient
from ..core.session import SessionManager
from ..core.encrypt_config import encrypt_api_key, decrypt_config
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


@router.get("/templates/{world}/preview")
async def preview_system_prompt(world: str):
    prompt = prompt_engine.render_system_prompt(world, "预览角色名")
    return {"preview": prompt}


WORLD_GEN_PROMPT = """你是一个游戏世界观设计师。根据用户提供的概念，生成一套完整的文字冒险游戏设定。

请严格按照以下 YAML 格式输出，不要添加任何额外说明文字：

```yaml
# world.yaml
name: 世界名称（英文 slug，如 cyberpunk_city）
description: |
  详细的世界观描述，包括地理、历史、势力、种族等
starting_scene: |
  {player_name}的冒险开场场景描述，用第二人称叙述
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
        path = settings.templates_dir / "worlds" / world_name / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    return {"world": world_name, "files": list(world_files.keys())}


def _parse_world_gen(raw: str, concept: str):
    import re

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
    player_yaml = sections.get("player", """name: 冒险者
description: 一位冒险者
background: 普通出身""")
    prefs_yaml = sections.get("preferences", f"""narrative_style: 生动的叙事风格
tone: 适合{concept}的语调
pacing: 适中
detail_level: 适中""")

    world_name = _extract_world_name(world_yaml, concept)

    return world_name, {
        "world.yaml": world_yaml,
        "player.yaml": player_yaml,
        "preferences.yaml": prefs_yaml,
    }


def _extract_world_name(yaml_str: str, fallback: str) -> str:
    import re
    m = re.search(r"^name:\s*(\S+)", yaml_str, re.MULTILINE)
    if m:
        name = m.group(1).lower().replace(" ", "_")
        return re.sub(r"[^a-z0-9_]", "", name)
    return re.sub(r"[^a-z0-9_]", "_", fallback.lower().replace(" ", "_"))[:20]


def _fallback_parse(raw: str, concept: str):
    import re
    world_name = re.sub(r"[^a-z0-9_]", "_", concept.lower().replace(" ", "_"))[:20]
    safe_concept = concept.replace('"', "'")

    return world_name, {
        "world.yaml": f"""name: {safe_concept}
description: |
  这是一个以「{safe_concept}」为主题的世界。

starting_scene: |
  {{player_name}}睁开双眼，发现自己正处在一个陌生的环境中。
  周围的一切都在诉说着这个世界的规则...
  冒险即将开始。""",
        "player.yaml": f"""name: 冒险者
description: 一位来到这个世界的冒险者
background: 怀着对未知的好奇，踏入了这个世界的门槛""",
        "preferences.yaml": f"""narrative_style: |
  生动的叙事风格，注重环境描写。
tone: 认真与轻松并存
pacing: 适中
detail_level: 丰富""",
    }


# ---- Game ----

@router.post("/game/new", response_model=NewGameResponse)
async def new_game(body: NewGameRequest):
    game_id = session_manager.create(body.world, body.player_name)
    return NewGameResponse(
        game_id=game_id,
        world=body.world,
        player_name=body.player_name,
    )


@router.post("/game/{game_id}/start")
async def start_game(game_id: str):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["messages"]:
        return {"status": "already_started"}

    game_state = session.get("game_state", {})
    system_prompt = prompt_engine.render_system_prompt(
        session["world"], session["player_name"], game_state
    )
    first_scene = prompt_engine.render_first_message(
        session["world"], session["player_name"]
    )
    starter = f"{system_prompt}\n\n现在开始游戏。玩家当前场景参考：{first_scene[:100]}..."
    if "首先，请为这个场景开场" not in starter:
        starter += "\n请以生动叙事开场，不要重复上述场景参考的原文。"

    messages = [
        {"role": "system", "content": starter},
        {"role": "user", "content": "(游戏开始)"},
    ]

    try:
        result = await llm_client.chat(messages)
        raw_reply = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    parsed = prompt_engine.parse_response(raw_reply)

    session["messages"].append({"role": "user", "content": "(游戏开始)"})
    session["messages"].append({"role": "assistant", "content": raw_reply})
    session["turn"] = 1

    if parsed["state_updates"]:
        session["game_state"] = prompt_engine.apply_state_updates(
            game_state, parsed["state_updates"]
        )
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
    system_prompt = prompt_engine.render_system_prompt(
        session["world"], session["player_name"], game_state
    )

    if not session["messages"]:
        first_scene = prompt_engine.render_first_message(
            session["world"], session["player_name"]
        )
        starter = f"{system_prompt}\n\n现在开始游戏。开场场景：{first_scene}"
    else:
        starter = system_prompt

    messages = [{"role": "system", "content": starter}]
    for msg in session["messages"]:
        messages.append(msg)
    messages.append({"role": "user", "content": body.action})

    try:
        result = await llm_client.chat(messages)
        raw_reply = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    parsed = prompt_engine.parse_response(raw_reply)

    session["messages"].append({"role": "user", "content": body.action})
    session["messages"].append({"role": "assistant", "content": raw_reply})
    session["turn"] += 1

    if parsed["state_updates"]:
        session["game_state"] = prompt_engine.apply_state_updates(
            game_state, parsed["state_updates"]
        )
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
    system_prompt = prompt_engine.render_system_prompt(
        session["world"], session["player_name"], game_state
    )

    if not session["messages"]:
        first_scene = prompt_engine.render_first_message(
            session["world"], session["player_name"]
        )
        starter = f"{system_prompt}\n\n现在开始游戏。开场场景：{first_scene}"
    else:
        starter = system_prompt

    messages = [{"role": "system", "content": starter}]
    for msg in session["messages"]:
        messages.append(msg)
    messages.append({"role": "user", "content": body.action})

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
                parsed = prompt_engine.parse_response(full_reply)
                session["messages"].append({"role": "user", "content": body.action})
                session["messages"].append({"role": "assistant", "content": full_reply})
                session["turn"] += 1
                if parsed["state_updates"]:
                    session["game_state"] = prompt_engine.apply_state_updates(
                        game_state, parsed["state_updates"]
                    )
                session_manager.save(game_id, session)
                yield f"data: {json.dumps({'parsed': {'suggestions': parsed['suggestions'], 'state': session['game_state']}})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
