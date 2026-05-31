from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re


PLAYER_NAME_RE = re.compile(r"^[a-zA-Z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff_-]{1,30}$")


class GameAction(BaseModel):
    action: str = Field(..., min_length=1, max_length=2000)


class GameResponse(BaseModel):
    content: str
    turn: int


class NewGameRequest(BaseModel):
    world: str = "fantasy"
    player_name: str = Field(default="", max_length=30)

    @field_validator("world")
    @classmethod
    def sanitize_world(cls, v: str) -> str:
        if not v:
            raise ValueError("world name is required")
        v = re.sub(r"[\/\\:*?\"<>|]", "", v.strip())
        v = v.replace("..", "")
        return v[:30]

    @field_validator("player_name")
    @classmethod
    def sanitize_player_name(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) > 30:
            raise ValueError("player_name too long (max 30 characters)")
        if v and not PLAYER_NAME_RE.match(v):
            raise ValueError(
                "player_name contains invalid characters; "
                "allowed: letters, digits, Chinese/Japanese, underscore, hyphen"
            )
        return v


class NewGameResponse(BaseModel):
    game_id: str
    world: str
    player_name: str


class GameSession(BaseModel):
    id: str
    world: str
    player_name: str
    messages: list[dict]
    turn: int
    created_at: str
    updated_at: str


class GameListItem(BaseModel):
    id: str
    world: str
    player_name: str
    turn: int
    created_at: str
    updated_at: str


class ConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class TemplateUpdate(BaseModel):
    """PUT /templates/{world}/world|player|preferences body"""
    model_config = {"extra": "allow"}


class TemplateSaveRequest(BaseModel):
    """PUT /templates/{world} - save all template parts at once"""
    world: dict = {}
    player: dict = {}
    preferences: dict = {}


class ModifyRequest(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=1000)


class GenerateRequest(BaseModel):
    concept: str = Field(..., min_length=1, max_length=500)


class ImportRequest(BaseModel):
    content: str = Field(..., max_length=500000)
    filename: str = Field(default="imported.txt", max_length=200)
    binary: bool = False
