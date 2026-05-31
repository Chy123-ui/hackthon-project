from pydantic_settings import BaseSettings
from pathlib import Path
import os


_DEFAULT_DATA = Path(__file__).parent.parent.parent / "data"


class Settings(BaseSettings):
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"
    max_tokens: int = 4096
    gen_max_tokens: int = 16384
    temperature: float = 0.8
    context_limit: int = 131072
    data_dir: Path = _DEFAULT_DATA
    worlds_dir: Path = _DEFAULT_DATA / "worlds"
    protocol_dir: Path = Path(__file__).parent.parent.parent / "protocol"

    model_config = {"env_prefix": "AIWENYOU_"}


settings = Settings()
if os.environ.get("RE_LIFE_DATA_DIR"):
    settings.data_dir = Path(os.environ["RE_LIFE_DATA_DIR"])
    settings.worlds_dir = settings.data_dir / "worlds"
settings.data_dir.mkdir(parents=True, exist_ok=True)
(settings.data_dir / "sessions").mkdir(exist_ok=True)
(settings.data_dir / "worlds").mkdir(parents=True, exist_ok=True)
