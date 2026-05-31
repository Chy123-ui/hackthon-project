"""游戏会话管理 -- 创建/保存/加载/删除会话, with gzip compression"""
import json
import gzip
import threading
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from .config import settings


class SessionManager:
    def __init__(self):
        self.sessions_dir = settings.data_dir / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self._locks: dict[str, threading.RLock] = {}
        self._locks_lock = threading.Lock()

    def _get_lock(self, game_id: str) -> threading.RLock:
        with self._locks_lock:
            if game_id not in self._locks:
                self._locks[game_id] = threading.RLock()
            return self._locks[game_id]

    def _session_path(self, game_id: str) -> Path:
        safe_name = game_id.replace("\\", "_").replace("/", "_").replace("..", "_")
        return self.sessions_dir / f"{safe_name}.json.gz"

    def create(self, world: str, player_name: str) -> str:
        game_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        session = {
            "id": game_id,
            "world": world,
            "player_name": player_name,
            "messages": [],
            "game_state": {},
            "suggestions": [],
            "turn": 0,
            "created_at": now,
            "updated_at": now,
        }
        with gzip.open(self._session_path(game_id), "wt", encoding="utf-8") as f:
            json.dump(session, f, ensure_ascii=False, indent=2)
        return game_id

    def load(self, game_id: str) -> Optional[dict]:
        path = self._session_path(game_id)
        if not path.exists():
            old = self.sessions_dir / f"{game_id}.json"
            if old.exists():
                with open(old, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return json.load(f)

    def save(self, game_id: str, session: dict) -> None:
        session["updated_at"] = datetime.now(timezone.utc).isoformat()
        tmp_path = self._session_path(game_id).with_suffix(".json.gz.tmp")
        with gzip.open(tmp_path, "wt", encoding="utf-8") as f:
            json.dump(session, f, ensure_ascii=False, indent=2, default=str)
        tmp_path.replace(self._session_path(game_id))

    def lock(self, game_id: str) -> threading.RLock:
        """Acquire lock for read-modify-write. Caller must release()."""
        lk = self._get_lock(game_id)
        lk.acquire()
        return lk

    def delete(self, game_id: str) -> bool:
        lock = self._get_lock(game_id)
        with lock:
            path = self._session_path(game_id)
            if path.exists():
                path.unlink()
                return True
            old = self.sessions_dir / f"{game_id}.json"
            if old.exists():
                old.unlink()
                return True
            return False

    def list_sessions(self) -> list[dict]:
        sessions = []
        for pattern in ("*.json.gz", "*.json"):
            for path in sorted(
                self.sessions_dir.glob(pattern),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            ):
                try:
                    if path.suffix == ".gz":
                        with gzip.open(path, "rt", encoding="utf-8") as f:
                            data = json.load(f)
                    else:
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
                except (json.JSONDecodeError, OSError, KeyError, gzip.BadGzipFile):
                    pass
        return sessions
