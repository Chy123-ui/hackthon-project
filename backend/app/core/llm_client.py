"""DeepSeek v4 LLM 客户端 -- 兼容 OpenAI API 格式"""
import httpx
from typing import Optional, AsyncIterator
from .config import settings


class LLMClient:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.base_url,
                headers={
                    "Authorization": f"Bearer {settings.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        return self._client

    async def chat(
        self,
        messages: list[dict],
        stream: bool = False,
    ) -> dict:
        client = await self._get_client()
        payload = {
            "model": settings.model,
            "messages": messages,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "stream": stream,
        }
        if stream:
            payload["stream_options"] = {"include_usage": True}
        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()
        return response.json()

    async def chat_stream(
        self, messages: list[dict]
    ) -> AsyncIterator[str]:
        client = await self._get_client()
        payload = {
            "model": settings.model,
            "messages": messages,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        async with client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    import json
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
