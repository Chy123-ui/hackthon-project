"""分层 Prompt 模板引擎 -- Agent 协议 + 状态管理 + 响应解析"""
import re
import yaml
from typing import Optional
from .config import settings


class PromptEngine:
    def __init__(self):
        self.templates_dir = settings.templates_dir

    def _load_yaml(self, path) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _save_yaml(self, path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

    # ---- Core (locked) ----

    def load_protocol(self) -> str:
        path = self.templates_dir / "core" / "protocol.yaml"
        if path.exists():
            data = self._load_yaml(path)
            return data.get("protocol", "")
        return ""

    def load_safety(self) -> str:
        path = self.templates_dir / "core" / "safety.yaml"
        if path.exists():
            data = self._load_yaml(path)
            return data.get("rules", "")
        return ""

    # ---- World (user-editable) ----

    def load_world(self, world: str) -> Optional[dict]:
        path = self.templates_dir / "worlds" / world / "world.yaml"
        if path.exists():
            return self._load_yaml(path)
        return None

    def save_world(self, world: str, data: dict) -> None:
        path = self.templates_dir / "worlds" / world / "world.yaml"
        self._save_yaml(path, data)

    def load_player(self, world: str) -> Optional[dict]:
        path = self.templates_dir / "worlds" / world / "player.yaml"
        if path.exists():
            return self._load_yaml(path)
        return None

    def save_player(self, world: str, data: dict) -> None:
        path = self.templates_dir / "worlds" / world / "player.yaml"
        self._save_yaml(path, data)

    def load_preferences(self, world: str) -> Optional[dict]:
        path = self.templates_dir / "worlds" / world / "preferences.yaml"
        if path.exists():
            return self._load_yaml(path)
        return None

    def save_preferences(self, world: str, data: dict) -> None:
        path = self.templates_dir / "worlds" / world / "preferences.yaml"
        self._save_yaml(path, data)

    # ---- Merge & Render ----

    def _format_state_context(self, state: dict) -> str:
        if not state:
            return "无"
        lines = []
        for key, value in state.items():
            if isinstance(value, list):
                lines.append(f"  {key}: [{', '.join(str(v) for v in value)}]")
            else:
                lines.append(f"  {key}: {value}")
        return "\n".join(lines)

    def build_context(self, world: str, player_name: str = "冒险者") -> dict:
        w = self.load_world(world) or {}
        p = self.load_player(world) or {}
        pref = self.load_preferences(world) or {}
        return {
            "world_name": w.get("name", world),
            "world_description": w.get("description", ""),
            "starting_scene": w.get("starting_scene", ""),
            "player_name": p.get("name", player_name),
            "player_description": p.get("description", ""),
            "player_background": p.get("background", ""),
            "narrative_style": pref.get("narrative_style", ""),
            "tone": pref.get("tone", ""),
            "pacing": pref.get("pacing", ""),
            "detail_level": pref.get("detail_level", ""),
        }

    def render_system_prompt(
        self,
        world: str,
        player_name: str = "冒险者",
        game_state: Optional[dict] = None,
    ) -> str:
        protocol = self.load_protocol()
        safety = self.load_safety()
        context = self.build_context(world, player_name)
        context["state_context"] = self._format_state_context(game_state or {})

        prompt = protocol.format(**context)
        if safety:
            prompt += "\n\n" + safety
        return prompt

    def render_first_message(
        self, world: str, player_name: str
    ) -> str:
        w = self.load_world(world) or {}
        starting_scene = w.get("starting_scene", "")
        if starting_scene:
            return starting_scene.format(player_name=player_name)
        return f"{player_name}的冒险开始了。"

    # ---- State Management ----

    def parse_response(self, raw: str) -> dict:
        result = {"thought": "", "narrate": "", "suggestions": [], "state_updates": {}}

        thought_match = re.search(r"<thought>(.*?)</thought>", raw, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()

        narrate_match = re.search(r"<narrate>(.*?)</narrate>", raw, re.DOTALL)
        if narrate_match:
            result["narrate"] = narrate_match.group(1).strip()

        suggestions_block = re.search(
            r"<suggestions>(.*?)</suggestions>", raw, re.DOTALL
        )
        if suggestions_block:
            actions = re.findall(
                r"<action>(.*?)</action>", suggestions_block.group(1), re.DOTALL
            )
            result["suggestions"] = [a.strip() for a in actions]

        state_block = re.search(r"<state>(.*?)</state>", raw, re.DOTALL)
        if state_block:
            self._parse_state_block(state_block.group(1), result["state_updates"])

        key_node = re.search(
            r"<key-node\s+summary=\"([^\"]*)\"\s*/>", raw
        )
        if key_node:
            result["key_node_summary"] = key_node.group(1)

        return result

    def _parse_state_block(self, block: str, updates: dict) -> None:
        for match in re.finditer(
            r"<set\s+key=\"([^\"]+)\">(.*?)</set>", block, re.DOTALL
        ):
            updates[match.group(1)] = match.group(2).strip()

        for match in re.finditer(
            r"<add\s+key=\"([^\"]+)\"\s+value=\"([^\"]*)\"\s*/>", block
        ):
            key, val = match.group(1), match.group(2)
            if key not in updates:
                updates[key] = []
            if isinstance(updates[key], list):
                updates[key].append(val)

        for match in re.finditer(r"<del\s+key=\"([^\"]+)\"\s*/>", block):
            updates[match.group(1)] = None

    def apply_state_updates(self, current_state: dict, updates: dict) -> dict:
        new_state = dict(current_state)
        for key, value in updates.items():
            if value is None:
                new_state.pop(key, None)
            elif isinstance(value, list) and key in new_state and isinstance(new_state[key], list):
                new_state[key] = new_state[key] + [v for v in value if v not in new_state[key]]
            else:
                new_state[key] = value
        return new_state

    # ---- Listing ----

    def list_worlds(self) -> list[str]:
        worlds_dir = self.templates_dir / "worlds"
        if not worlds_dir.exists():
            return []
        return sorted([
            d.name
            for d in worlds_dir.iterdir()
            if d.is_dir() and (d / "world.yaml").exists()
        ])
