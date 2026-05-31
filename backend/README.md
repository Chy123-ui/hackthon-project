# re:life Backend

FastAPI backend for the AI text adventure game engine. Powers a GM Agent that runs text-based adventures via OpenAI-compatible APIs, with autonomous state management.

## Quick Start

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt    # Windows
# source .venv/bin/pip install -r requirements.txt  # macOS/Linux
.venv\Scripts\python -m uvicorn app.main:app --reload
```

Or use `start-dev.bat` / `start-dev.sh` from the project root.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current config |
| PUT | `/api/config` | Update config (api_key, model, etc) |
| GET | `/api/templates` | List available worlds |
| GET/PUT/DELETE | `/api/templates/{world}` | World CRUD + player/preferences sub-resources |
| GET | `/api/templates/core/protocol` | Agent protocol (locked) |
| GET | `/api/templates/core/safety` | Safety rules (locked) |
| GET | `/api/templates/{world}/preview` | Rendered system prompt preview |
| GET | `/api/templates/{world}/export` | Export world + player + preferences |
| POST | `/api/templates/new` | AI-generate new world from concept |
| POST | `/api/templates/import` | Import world from file / paste |
| POST | `/api/templates/{world}/modify` | AI-modify existing world |
| GET | `/api/templates/{world}/modify-suggestions` | Get modification suggestions |
| POST | `/api/game/new` | Create new game session |
| POST | `/api/game/{id}/start` | Start game (generate first scene) |
| POST | `/api/game/{id}/action` | Send player action (JSON) |
| POST | `/api/game/{id}/action/stream` | Send player action (SSE stream) |
| GET | `/api/game/{id}/history` | Get session history + state |
| GET | `/api/game/{id}/tokens` | Token usage estimate |
| DELETE | `/api/game/{id}` | Delete session |
| GET | `/api/games` | List all sessions |

Interactive docs at `http://localhost:8000/docs`.

## Template Structure

```
backend/
  default_worlds/                [Default templates - tracked]
    fantasy/                     Fantasy world template
      world.yaml
      player.yaml
      preferences.yaml
  protocol/                      [LOCKED - project maintained]
    protocol.yaml                Agent identity, output format, state rules
    safety.yaml                  Content safety guardrails
  data/worlds/{world}/           [Player editable - gitignored]
    world.yaml                   World name, description, starting scene
    player.yaml                  Character name, background
    preferences.yaml             Narrative tone, pacing, detail level
```

## Agent Protocol

The AI operates as an autonomous GM Agent. Each response is structured XML:

```xml
<thought>Internal reasoning (hidden from player)</thought>
<narrate>Narrative text (shown to player)</narrate>
<state>
  <set key="location">Tavern</set>
  <add key="npcs_met" value="Barkeep"/>
  <del key="old_flag"/>
</state>
<suggestions>
  <action>Talk to the barkeep</action>
  <action>Look around</action>
</suggestions>
```

The backend parses `<state>` blocks and persists them into `session.game_state`, which is injected back into the system prompt on the next turn.

## Security

| Feature | Implementation |
|---------|---------------|
| API Key encryption | Fernet symmetric, `.key` file auto-chmod 600 |
| Input validation | Path traversal check, length limits, player_name regex |
| Error messages | Unified "LLM API request failed", full errors logged only |
| Rate limiting | LLM endpoints 5/min, default 30/min, IP-based sliding window |
| CORS | Whitelist localhost:5173/8000 |
| Session locking | Per-game read-modify-write lock |
| Atomic writes | tmp file + rename for config/sessions/YAML |

## Data

- Config: `data/config.json` (encrypted, gitignored)
- Sessions: `data/sessions/{id}.json.gz` (gitignored)
- Worlds: `data/worlds/{name}/*.yaml` (gitignored)

## Dependencies

- FastAPI + Uvicorn
- httpx (LLM API client)
- PyYAML (template parsing)
- Pydantic + pydantic-settings (data validation)
- cryptography (API key encryption)
- tiktoken (token counting, fallback to char/4)

## Testing

```bash
pip install pytest pytest-asyncio httpx
python -m pytest backend/tests/ -v
```

66 tests covering security, input validation, error handling, concurrency, and rate limiting.
