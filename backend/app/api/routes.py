"""API 路由"""
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from ..core.config import settings
from ..core.prompt_engine import PromptEngine
from ..core.llm_client import LLMClient
from ..core.session import SessionManager
from ..models.game import (
    NewGameRequest,
    NewGameResponse,
    GameAction,
    GameResponse,
    GameSession,
    GameListItem,
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
            return json.load(f)
    return {}


def _save_server_config(config: dict) -> None:
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


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


@router.get("/templates")
async def list_templates():
    worlds = prompt_engine.list_worlds()
    return {"worlds": worlds}


@router.get("/templates/{world}/user")
async def get_user_template(world: str):
    user = prompt_engine.load_user_template(world)
    if user is None:
        return {}
    return user


@router.put("/templates/{world}/user")
async def update_user_template(world: str, body: dict):
    prompt_engine.save_user_template(world, body)
    return {"status": "ok"}


@router.get("/templates/{world}/core")
async def get_core_template(world: str):
    core = prompt_engine.load_core_template(world)
    if core is None:
        raise HTTPException(status_code=404, detail=f"World '{world}' not found")
    return core


@router.get("/templates/{world}/preview")
async def preview_template(world: str):
    return {"preview": prompt_engine.preview_merged(world)}


@router.post("/game/new", response_model=NewGameResponse)
async def new_game(body: NewGameRequest):
    game_id = session_manager.create(body.world, body.player_name)
    return NewGameResponse(
        game_id=game_id,
        world=body.world,
        player_name=body.player_name,
    )


@router.post("/game/{game_id}/action")
async def game_action(game_id: str, body: GameAction):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    system_prompt = prompt_engine.render_system_prompt(
        session["world"], session["player_name"]
    )

    if not session["messages"]:
        context = prompt_engine.merge_context(session["world"], session["player_name"])
        default_start = context.get("default_start", "").format(
            player_name=session["player_name"]
        )
        starter_msg = f"{system_prompt}\n\n现在开始。请为玩家开启冒险，{default_start}"
    else:
        starter_msg = system_prompt

    messages = [{"role": "system", "content": starter_msg}]
    for msg in session["messages"]:
        messages.append(msg)
    messages.append({"role": "user", "content": body.action})

    try:
        result = await llm_client.chat(messages)
        reply = result["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    session["messages"].append({"role": "user", "content": body.action})
    session["messages"].append({"role": "assistant", "content": reply})
    session["turn"] += 1
    session_manager.save(game_id, session)

    return GameResponse(content=reply, turn=session["turn"])


@router.post("/game/{game_id}/action/stream")
async def game_action_stream(game_id: str, body: GameAction):
    session = session_manager.load(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    system_prompt = prompt_engine.render_system_prompt(
        session["world"], session["player_name"]
    )

    if not session["messages"]:
        context = prompt_engine.merge_context(session["world"], session["player_name"])
        default_start = context.get("default_start", "").format(
            player_name=session["player_name"]
        )
        starter_msg = f"{system_prompt}\n\n现在开始。请为玩家开启冒险，{default_start}"
    else:
        starter_msg = system_prompt

    messages = [{"role": "system", "content": starter_msg}]
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
                session["messages"].append({"role": "user", "content": body.action})
                session["messages"].append({"role": "assistant", "content": full_reply})
                session["turn"] += 1
                session_manager.save(game_id, session)
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


@router.get("/games", response_model=list[GameListItem])
async def list_games():
    return session_manager.list_sessions()
