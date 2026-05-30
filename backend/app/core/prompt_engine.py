"""分层 Prompt 模板引擎 -- Agent 协议 + 状态管理 + 响应解析"""
import re
import shutil
import yaml
from typing import Optional
from pathlib import Path
from .config import settings


def _build_extra(w: dict, p: dict, pref: dict) -> str:
    """Extract extra YAML fields and output state key format instructions"""
    known = {"name", "description", "starting_scene", "background", "narrative_style", "tone", "pacing", "detail_level"}
    lines = []
    for _, data in [("世界额外设定", w), ("角色额外设定", p), ("偏好额外设定", pref)]:
        extras = {k: v for k, v in data.items() if k not in known}
        if extras:
            for k, v in extras.items():
                label = k
                if isinstance(v, dict) and "label" in v:
                    label = str(v["label"])
                elif isinstance(v, dict) and "name" in v:
                    label = str(v["name"])
                lines.append(f"  {k}: {yaml.dump(v, allow_unicode=True).strip()}")
                lines.append(f"    → 在 state 中使用: <set key=\"{k}\" label=\"{label}\">值</set>")
    return "\n".join(lines) if lines else "无"


class PromptEngine:
    def __init__(self):
        self.worlds_dir = settings.worlds_dir
        self.protocol_dir = settings.protocol_dir
        self.worlds_dir.mkdir(parents=True, exist_ok=True)
        self._seed_defaults()

    def _load_yaml(self, path) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _save_yaml(self, path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

    def _seed_defaults(self) -> None:
        """Copy fantasy default template if data/worlds is empty"""
        if self.list_worlds():
            return
        default = Path(__file__).parent.parent.parent / "default_worlds" / "fantasy"
        if default.exists():
            shutil.copytree(default, self.worlds_dir / "fantasy")

    def load_protocol(self) -> str:
        path = self.protocol_dir / "protocol.yaml"
        if path.exists():
            data = self._load_yaml(path)
            return data.get("protocol", "")
        return ""

    def load_safety(self) -> str:
        path = self.protocol_dir / "safety.yaml"
        if path.exists():
            data = self._load_yaml(path)
            return data.get("rules", "")
        return ""

    def _find_world_file(self, world: str, filename: str) -> Optional[Path]:
        path = self.worlds_dir / world / filename
        return path if path.exists() else None

    def load_world(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "world.yaml")
        return self._load_yaml(path) if path else None

    def save_world(self, world: str, data: dict) -> None:
        self._save_yaml(self.worlds_dir / world / "world.yaml", data)

    def load_player(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "player.yaml")
        return self._load_yaml(path) if path else None

    def save_player(self, world: str, data: dict) -> None:
        self._save_yaml(self.worlds_dir / world / "player.yaml", data)

    def load_preferences(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "preferences.yaml")
        return self._load_yaml(path) if path else None

    def save_preferences(self, world: str, data: dict) -> None:
        self._save_yaml(self.worlds_dir / world / "preferences.yaml", data)

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
            "extra_context": _build_extra(w, p, pref),
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

    def render_first_message(self, world: str, player_name: str) -> str:
        w = self.load_world(world) or {}
        starting_scene = w.get("starting_scene", "")
        if starting_scene:
            return starting_scene.format(player_name=player_name)
        return f"{player_name}的冒险开始了。"

    def parse_response(self, raw: str) -> dict:
        result = {"thought": "", "narrate": "", "suggestions": [], "state_updates": {}}
        thought_match = re.search(r"<thought>(.*?)</thought>", raw, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()
        narrate_match = re.search(r"<narrate>(.*?)</narrate>", raw, re.DOTALL)
        if narrate_match:
            result["narrate"] = narrate_match.group(1).strip()
        suggestions_block = re.search(r"<suggestions>(.*?)</suggestions>", raw, re.DOTALL)
        if suggestions_block:
            actions = re.findall(r"<action>(.*?)</action>", suggestions_block.group(1), re.DOTALL)
            result["suggestions"] = [a.strip() for a in actions]
        state_block = re.search(r"<state>(.*?)</state>", raw, re.DOTALL)
        if state_block:
            self._parse_state_block(state_block.group(1), result["state_updates"])
        key_node = re.search(r"<key-node\s+summary=\"([^\"]*)\"\s*/>", raw)
        if key_node:
            result["key_node_summary"] = key_node.group(1)
        return result

    def _parse_state_block(self, block: str, updates: dict) -> None:
        for match in re.finditer(r"<set\s+key=\"([^\"]+)\"(?:\s+label=\"([^\"]*)\")?>(.*?)</set>", block, re.DOTALL):
            key, label, val = match.group(1), match.group(2), match.group(3).strip()
            if label:
                updates[key] = {"value": val, "label": label}
            else:
                updates[key] = val
        for match in re.finditer(r"<add\s+key=\"([^\"]+)\"\s+value=\"([^\"]*)\"(\s+label=\"([^\"]*)\")?\s*/>", block):
            key, val, label = match.group(1), match.group(2), match.group(4)
            if key not in updates:
                updates[key] = []
            if isinstance(updates[key], list):
                entry = {"value": val, "label": label} if label else val
                updates[key].append(entry)
        for match in re.finditer(r"<del\s+key=\"([^\"]+)\"\s*/>", block):
            updates[match.group(1)] = None

    def apply_state_updates(self, current_state: dict, updates: dict) -> dict:
        new_state = dict(current_state)
        for key, value in updates.items():
            if value is None:
                new_state.pop(key, None)
            elif isinstance(value, list) and key in new_state and isinstance(new_state[key], list):
                existing_set = {v.get("value") if isinstance(v, dict) else v for v in new_state[key]}
                for v in value:
                    v_clean = v.get("value") if isinstance(v, dict) else v
                    if v_clean not in existing_set:
                        new_state[key].append(v)
                        if isinstance(v, dict):
                            existing_set.add(v.get("value"))
                        else:
                            existing_set.add(v)
            else:
                new_state[key] = value
        return new_state

    def list_worlds(self) -> list[str]:
        if not self.worlds_dir.exists():
            return []
        return sorted([
            d.name
            for d in self.worlds_dir.iterdir()
            if d.is_dir() and (d / "world.yaml").exists()
        ])

    def delete_world(self, world: str) -> bool:
        import shutil
        path = self.worlds_dir / world
        if path.exists() and path.is_dir():
            shutil.rmtree(path)
            return True
        return False
