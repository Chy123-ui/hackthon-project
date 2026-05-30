"""Token counting with optional tiktoken, falls back to char/4 estimate"""
from typing import Optional

try:
    import tiktoken
    _ENC = tiktoken.get_encoding("cl100k_base")
    _HAS_TIKTOKEN = True
except Exception:
    _ENC = None
    _HAS_TIKTOKEN = False


def count_tokens(text: str) -> int:
    if _HAS_TIKTOKEN and _ENC:
        return len(_ENC.encode(text))
    return len(text) // 4


def count_messages(messages: list[dict]) -> int:
    total = 0
    for m in messages:
        total += 4
        total += count_tokens(m.get("content", ""))
    return total + 2
