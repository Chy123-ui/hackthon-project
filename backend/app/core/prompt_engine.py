"""分层 Prompt 模板引擎 -- Agent 协议 + 状态管理 + 响应解析"""
import re
import shutil
import yaml
from typing import Optional
from pathlib import Path
from .config import settings


def _escape_format(s: str) -> str:
    return s.replace("{", "{{").replace("}}", "}}")


def _sanitize_yaml(data):
    """Recursively strip control chars and escape YAML-significant content"""
    if isinstance(data, str):
        data = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", data)
        lines = data.split("\n")
        for i, line in enumerate(lines):
            stripped = line.lstrip()
            if stripped and stripped[0] in "-[{&*!@%>`|":
                lines[i] = line.replace(stripped, "\\" + stripped, 1)
        data = "\n".join(lines)
        return data
    if isinstance(data, dict):
        return {k: _sanitize_yaml(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_sanitize_yaml(v) for v in data]
    return data


class PromptEngine:
    def __init__(self):
        self.worlds_dir = settings.worlds_dir
        self.protocol_dir = settings.protocol_dir
        self.worlds_dir.mkdir(parents=True, exist_ok=True)
        self._seed_defaults()

    @staticmethod
    def _validate_world_name(world: str) -> str:
        if not world:
            raise ValueError("world name is required")
        if ".." in world:
            raise ValueError("invalid world name")
        cleaned = re.sub(r"[\/\\:*?\"<>|]", "", world.strip())
        if not cleaned:
            raise ValueError("invalid world name")
        return cleaned[:30]

    def _resolve_world_dir(self, world: str) -> Path:
        safe = self._validate_world_name(world)
        resolved = (self.worlds_dir / safe).resolve()
        if not str(resolved).startswith(str(self.worlds_dir.resolve())):
            raise ValueError("path traversal detected")
        return resolved

    def _load_yaml(self, path) -> dict:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", f.read())
                return yaml.safe_load(raw) or {}
        except (yaml.YAMLError, OSError, ValueError):
            return {}

    def _save_yaml(self, path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix(path.suffix + ".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            yaml.dump(_sanitize_yaml(data), f, allow_unicode=True, default_flow_style=False)
        tmp_path.replace(path)

    def _seed_defaults(self) -> None:
        """Copy fantasy default template only on first run"""
        marker = self.worlds_dir / ".seeded"
        if marker.exists():
            return
        fantasy = self.worlds_dir / "fantasy"
        if not fantasy.exists():
            default = Path(__file__).parent.parent.parent / "default_worlds" / "fantasy"
            if default.exists():
                shutil.copytree(default, fantasy)
        marker.touch()

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
        path = self._resolve_world_dir(world) / filename
        return path if path.exists() else None

    def load_world(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "world.yaml")
        return self._load_yaml(path) if path else None

    def save_world(self, world: str, data: dict) -> None:
        self._save_yaml(self._resolve_world_dir(world) / "world.yaml", data)

    def load_player(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "player.yaml")
        return self._load_yaml(path) if path else None

    def save_player(self, world: str, data: dict) -> None:
        self._save_yaml(self._resolve_world_dir(world) / "player.yaml", data)

    def load_preferences(self, world: str) -> Optional[dict]:
        path = self._find_world_file(world, "preferences.yaml")
        return self._load_yaml(path) if path else None

    def save_preferences(self, world: str, data: dict) -> None:
        self._save_yaml(self._resolve_world_dir(world) / "preferences.yaml", data)

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

    def build_context(self, world: str, player_name: str = "") -> dict:
        w = self.load_world(world) or {}
        p = self.load_player(world) or {}
        pref = self.load_preferences(world) or {}
        return {
            "world_name": w.get("name", world),
            "world_description": w.get("description", ""),
            "starting_scene": w.get("starting_scene", ""),
            "player_name": player_name or p.get("name") or "冒险者",
            "player_description": p.get("description", ""),
            "player_background": p.get("background", ""),
            "narrative_style": pref.get("narrative_style", ""),
            "tone": pref.get("tone", ""),
            "pacing": pref.get("pacing", ""),
            "detail_level": pref.get("detail_level", ""),
            "extra_context": "",
        }

    def render_system_prompt(
        self,
        world: str,
        player_name: str = "",
        game_state: Optional[dict] = None,
    ) -> str:
        protocol = self.load_protocol()
        safety = self.load_safety()
        context = self.build_context(world, player_name)
        context["state_context"] = self._format_state_context(game_state or {})
        context = {k: _escape_format(str(v)) for k, v in context.items()}
        prompt = protocol.format(**context)
        if safety:
            prompt += "\n\n" + safety
        return prompt

    def render_first_message(self, world: str, player_name: str) -> str:
        w = self.load_world(world) or {}
        starting_scene = w.get("starting_scene", "")
        if starting_scene:
            return starting_scene.format(player_name=_escape_format(player_name))
        return f"{player_name}的冒险开始了。"

    def parse_response(self, raw: str) -> dict:
        result = {"thought": "", "narrate": "", "suggestions": [], "state_updates": {}}
        thought_match = re.search(r"<thought>(.*?)</thought>", raw, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()
        narrate_match = re.search(r"<narrate>(.*?)</narrate>", raw, re.DOTALL)
        if narrate_match:
            result["narrate"] = narrate_match.group(1).strip()
        suggestions_block = re.search(r"<(suggestions|actions)>(.*?)</\1>", raw, re.DOTALL)
        if suggestions_block:
            actions = re.findall(r"<action>(.*?)</action>", suggestions_block.group(2), re.DOTALL)
            result["suggestions"] = [a.strip() for a in actions]
        state_block = re.search(r"<state>(.*?)</state>", raw, re.DOTALL)
        if state_block:
            self._parse_state_block(state_block.group(1), result["state_updates"])
        key_node = re.search(r"<key-node\s+summary=\"([^\"]*)\"\s*/>", raw)
        if key_node:
            result["key_node_summary"] = key_node.group(1)
        return result

    def _parse_state_block(self, block: str, updates: dict) -> None:
        for match in re.finditer(r"<set\s+key=\"([^\"]+)\">(.*?)</set>", block, re.DOTALL):
            updates[match.group(1)] = match.group(2).strip()
        for match in re.finditer(r"<add\s+key=\"([^\"]+)\"\s+value=\"([^\"]*)\"(\s+label=\"([^\"]*)\")?\s*/>", block):
            key, val, label = match.group(1), match.group(2), match.group(4)
            if key not in updates:
                updates[key] = []
            if isinstance(updates[key], list):
                entry = {"value": val, "label": label} if label else val
                updates[key].append(entry)
        for match in re.finditer(r"<del\s+key=\"([^\"]+)\"\s+value=\"([^\"]*)\"\s*/>", block):
            key, val = match.group(1), match.group(2)
            if key not in updates:
                updates[key] = []
            if isinstance(updates[key], list):
                updates[key].append({"__del": val})
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
                    if isinstance(v, dict) and v.get("__del"):
                        del_val = v["__del"]
                        new_state[key] = [
                            item for item in new_state[key]
                            if (item.get("value") if isinstance(item, dict) else item) != del_val
                        ]
                        existing_set.discard(del_val)
                    else:
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
        try:
            path = self._resolve_world_dir(world)
        except ValueError:
            return False
        if path.exists() and path.is_dir():
            shutil.rmtree(path)
            return True
        return False
