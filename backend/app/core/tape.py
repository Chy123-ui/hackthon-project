"""Tape Engine -- label messages, assemble context with budget"""
from .token_counter import count_messages

LIVE_COUNT = 5
COMPRESS_GROUP = 5
RESERVED_REPLY = 2048


def label_messages(messages: list[dict]) -> list[dict]:
    """Assign tape labels to messages: live for last N turns, rest normal"""
    labeled = []
    turn_indices = [
        i for i, m in enumerate(messages) if m.get("tape") != "compressed"
    ]
    live_start = max(0, len(turn_indices) - LIVE_COUNT * 2)

    for i, msg in enumerate(messages):
        m = dict(msg)
        if i >= live_start and i < len(messages):
            m["tape"] = "live"
        elif m.get("tape") not in ("key", "compressed"):
            m["tape"] = "normal"
        labeled.append(m)
    return labeled


def assemble_messages(
    session: dict,
    system_prompt: str,
    max_tokens: int,
    current_action: str | None = None,
) -> list[dict]:
    """Build the messages array respecting tape budget"""
    messages = label_messages(session["messages"])

    system_msg = {"role": "system", "content": system_prompt}
    system_tokens = 4 + len(system_prompt) // 4 + 2

    budget = max_tokens - system_tokens - RESERVED_REPLY
    if budget < 500:
        budget = 500

    result = []
    used = 0

    for m in messages:
        tape = m.get("tape", "normal")
        if tape == "compressed":
            text = m.get("content", "")
        elif tape in ("live", "key"):
            text = m.get("content", "")
        else:
            text = _compress_msg(m, messages)

        est = 4 + len(text) // 4
        if used + est > budget:
            break
        result.append({"role": m.get("role", "user"), "content": text})
        used += est

    if current_action:
        result.append({"role": "user", "content": current_action})

    return [system_msg] + result


def _compress_msg(msg: dict, all_msgs: list[dict]) -> str:
    idx = all_msgs.index(msg) if msg in all_msgs else -1
    if idx < 0:
        return "[summary] 更早的冒险经历"
    group = idx // (COMPRESS_GROUP * 2)
    first_user = ""
    for i in range(group * COMPRESS_GROUP * 2, min((group + 1) * COMPRESS_GROUP * 2, len(all_msgs))):
        m = all_msgs[i]
        if m.get("role") == "user":
            first_user = m.get("content", "")[:80]
            break
    return f"[summary] T{group*COMPRESS_GROUP+1}-{min((group+1)*COMPRESS_GROUP, (len(all_msgs)//2))}: {first_user}..."


def compress_session(session: dict) -> None:
    """Replace old non-key messages with compressed summaries"""
    messages = session["messages"]
    labeled = label_messages(messages)
    new_messages = []
    group_idx = 0
    group_msgs = []

    for i, m in enumerate(labeled):
        tape = m.get("tape", "normal")
        if tape in ("live", "key"):
            if group_msgs:
                _flush_group(new_messages, group_msgs, group_idx)
                group_idx += 1
                group_msgs = []
            new_messages.append(m)
        elif tape == "compressed":
            new_messages.append(m)
        else:
            group_msgs.append(m)
            if len(group_msgs) >= COMPRESS_GROUP * 2:
                _flush_group(new_messages, group_msgs, group_idx)
                group_idx += 1
                group_msgs = []

    if group_msgs:
        _flush_group(new_messages, group_msgs, group_idx)

    session["messages"] = new_messages


def _flush_group(dest: list, group: list[dict], idx: int) -> None:
    if not group:
        return
    first = next((m.get("content", "") for m in group if m.get("role") == "user"), "")
    last = next(
        (m.get("content", "") for m in reversed(group) if m.get("role") == "assistant"), ""
    )
    summary = f"[summary] T{idx*COMPRESS_GROUP+1}-{idx*COMPRESS_GROUP+len(group)//2}: {first[:60]}"
    if last:
        narrate = _extract_narrate(last)
        if narrate:
            summary += f" → {narrate[:60]}"
    dest.append({"role": "assistant", "content": summary, "tape": "compressed"})


def _extract_narrate(text: str) -> str:
    import re
    m = re.search(r"<narrate>([\s\S]*?)</narrate>", text)
    return m.group(1).strip() if m else ""
