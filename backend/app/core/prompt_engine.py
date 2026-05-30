"""分层 Prompt 模板引擎 -- 借鉴 Skills 的 SOURCE + OVERRIDE 模式"""
import yaml
from pathlib import Path
from typing import Optional
from .config import settings


class PromptEngine:
    def __init__(self):
        self.templates_dir = settings.templates_dir

    def _load_yaml(self, path: Path) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def load_base_system(self) -> str:
        path = self.templates_dir / "base" / "system.yaml"
        if path.exists():
            data = self._load_yaml(path)
            return data.get("system_prompt_template", "")
        return ""

    def load_core_template(self, world: str) -> Optional[dict]:
        path = self.templates_dir / "worlds" / world / "core.yaml"
        if path.exists():
            return self._load_yaml(path)
        return None

    def load_user_template(self, world: str) -> Optional[dict]:
        path = self.templates_dir / "worlds" / world / "user.yaml"
        if path.exists():
            return self._load_yaml(path)
        return None

    def save_user_template(self, world: str, data: dict) -> None:
        path = self.templates_dir / "worlds" / world / "user.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

    def merge_context(self, world: str, player_name: str = "冒险者") -> dict:
        core = self.load_core_template(world) or {}
        user = self.load_user_template(world) or {}
        return {
            "world_name": core.get("world", {}).get("name", world),
            "world_description": core.get("world", {}).get("description", ""),
            "narrative_style": core.get("narrative_style", ""),
            "safety_rules": core.get("safety_rules", ""),
            "default_start": core.get("default_start", ""),
            "player_name": user.get("player", {}).get("name", player_name),
            "player_description": user.get("player", {}).get("description", ""),
            "player_background": user.get("player", {}).get("background", ""),
            "tone": user.get("preferences", {}).get("tone", ""),
            "pacing": user.get("preferences", {}).get("pacing", ""),
            "detail_level": user.get("preferences", {}).get("detail_level", ""),
        }

    def render_system_prompt(
        self,
        world: str,
        player_name: str = "冒险者",
        current_location: str = "未知",
        player_status: str = "正常",
    ) -> str:
        base_template = self.load_base_system()
        context = self.merge_context(world, player_name)
        context["current_location"] = current_location
        context["player_status"] = player_status
        return base_template.format(**context)

    def list_worlds(self) -> list[str]:
        worlds_dir = self.templates_dir / "worlds"
        if not worlds_dir.exists():
            return []
        return [
            d.name
            for d in worlds_dir.iterdir()
            if d.is_dir() and (d / "core.yaml").exists()
        ]

    def preview_merged(self, world: str) -> str:
        core = self.load_core_template(world) or {}
        user = self.load_user_template(world) or {}
        merged = {
            "world": core.get("world", {}),
            "narrative_style": core.get("narrative_style", ""),
            "safety_rules": core.get("safety_rules", ""),
            "default_start": core.get("default_start", ""),
            "player": user.get("player", {}),
            "preferences": user.get("preferences", {}),
        }
        return yaml.dump(merged, allow_unicode=True, default_flow_style=False)
