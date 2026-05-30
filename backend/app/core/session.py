"""游戏会话管理 -- 创建/保存/加载/删除会话"""
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from .config import settings


class SessionManager:
    def __init__(self):
        self.sessions_dir = settings.data_dir / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def _session_path(self, game_id: str) -> Path:
        return self.sessions_dir / f"{game_id}.json"

    def create(self, world: str, player_name: str) -> str:
        game_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        session = {
            "id": game_id,
            "world": world,
            "player_name": player_name,
            "messages": [],
            "game_state": {},
            "turn": 0,
            "created_at": now,
            "updated_at": now,
        }
        with open(self._session_path(game_id), "w", encoding="utf-8") as f:
            json.dump(session, f, ensure_ascii=False, indent=2)
        return game_id

    def load(self, game_id: str) -> Optional[dict]:
        path = self._session_path(game_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save(self, game_id: str, session: dict) -> None:
        session["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(self._session_path(game_id), "w", encoding="utf-8") as f:
            json.dump(session, f, ensure_ascii=False, indent=2, default=str)

    def delete(self, game_id: str) -> bool:
        path = self._session_path(game_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def list_sessions(self) -> list[dict]:
        sessions = []
        for path in sorted(
            self.sessions_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        ):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                sessions.append(
                    {
                        "id": data["id"],
                        "world": data["world"],
                        "player_name": data["player_name"],
                        "turn": data["turn"],
                        "created_at": data.get("created_at", ""),
                        "updated_at": data.get("updated_at", ""),
                    }
                )
        return sessions
