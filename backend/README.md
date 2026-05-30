# AI WenYou Backend

FastAPI backend for the AI text adventure game engine. Powers a GM Agent that runs text-based adventures via DeepSeek v4, with autonomous state management.

## Quick Start

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt    # Windows
# source .venv/bin/pip install -r requirements.txt  # macOS/Linux
.venv\Scripts\python -m uvicorn app.main:app --reload
```

Or use `start.bat` from the project root (auto-creates venv if needed).

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current config |
| PUT | `/api/config` | Update config (api_key, model, etc) |
| GET | `/api/templates` | List available worlds |
| GET | `/api/templates/core/protocol` | Agent protocol (locked) |
| GET | `/api/templates/core/safety` | Safety rules (locked) |
| GET/PUT | `/api/templates/{world}/world` | World template |
| GET/PUT | `/api/templates/{world}/player` | Player template |
| GET/PUT | `/api/templates/{world}/preferences` | Preferences template |
| GET | `/api/templates/{world}/preview` | Rendered system prompt |
| POST | `/api/templates/new` | AI-generate new world from concept |
| POST | `/api/game/new` | Create new game session |
| POST | `/api/game/{id}/action` | Send player action (JSON) |
| POST | `/api/game/{id}/action/stream` | Send player action (SSE stream) |
| GET | `/api/game/{id}/history` | Get session history + state |
| DELETE | `/api/game/{id}` | Delete session |
| GET | `/api/games` | List all sessions |

Interactive docs at `http://localhost:8000/docs`.

## Template Structure

```
templates/
  core/                         [LOCKED - project maintained]
    protocol.yaml               Agent identity, output format, state rules
    safety.yaml                 Content safety guardrails
  worlds/{world}/               [Player editable]
    world.yaml                  World name, description, starting scene
    player.yaml                 Character name, background
    preferences.yaml            Narrative tone, pacing, detail level
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

The backend parses `<state>` blocks and persists them into `session.game_state`, which is injected back into the system prompt on the next turn -- giving the AI persistent memory it manages autonomously.

## Data

- Config: `data/config.json` (gitignored)
- Sessions: `data/sessions/{id}.json` (gitignored)

## Dependencies

- FastAPI + Uvicorn
- httpx (LLM API client)
- PyYAML (template parsing)
- Pydantic (data validation)
