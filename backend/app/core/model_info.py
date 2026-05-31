"""Fetch model info from API to get max_context_length"""
import httpx
import logging
from .config import settings

logger = logging.getLogger(__name__)


async def fetch_model_max_tokens() -> int:
    try:
        async with httpx.AsyncClient(
            base_url=settings.base_url,
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=10.0,
        ) as client:
            resp = await client.get("/models")
            resp.raise_for_status()
            data = resp.json()
            for m in data.get("data", []):
                if m.get("id") == settings.model:
                    ctx = m.get("context_window") or m.get("max_input_tokens") or 131072
                    return int(ctx)
    except (httpx.HTTPError, OSError, ValueError, KeyError) as e:
        logger.warning("Failed to fetch model info for model=%s: %s", settings.model, e)
        pass
    return 131072
