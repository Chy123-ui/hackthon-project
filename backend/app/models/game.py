from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GameAction(BaseModel):
    action: str


class GameResponse(BaseModel):
    content: str
    turn: int


class NewGameRequest(BaseModel):
    world: str = "fantasy"
    player_name: str = "冒险者"


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
