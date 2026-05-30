const API_BASE = "http://localhost:8000/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface GameListItem {
  id: string;
  world: string;
  player_name: string;
  turn: number;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  world: string;
  player_name: string;
  messages: { role: string; content: string }[];
  game_state: Record<string, unknown>;
  suggestions?: string[];
  turn: number;
}

export interface GameActionResponse {
  content: string;
  thought: string;
  suggestions: string[];
  state: Record<string, unknown>;
  turn: number;
}

export interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface TokenInfo {
  used: number;
  budget: number;
  percent: number;
}

export async function getConfig(): Promise<Config> {
  return request<Config>("/config");
}

export async function updateConfig(config: Config): Promise<void> {
  await request("/config", { method: "PUT", body: JSON.stringify(config) });
}

export async function getCoreProtocol(): Promise<{ protocol: string }> {
  return request("/templates/core/protocol");
}

export async function getCoreSafety(): Promise<{ rules: string }> {
  return request("/templates/core/safety");
}

export async function listWorlds(): Promise<{ worlds: string[] }> {
  return request("/templates");
}

export async function getWorldTemplate(world: string): Promise<Record<string, unknown>> {
  return request(`/templates/${world}/world`);
}

export async function updateWorldTemplate(world: string, data: Record<string, unknown>): Promise<void> {
  await request(`/templates/${world}/world`, { method: "PUT", body: JSON.stringify(data) });
}

export async function getPlayerTemplate(world: string): Promise<Record<string, unknown>> {
  return request(`/templates/${world}/player`);
}

export async function updatePlayerTemplate(world: string, data: Record<string, unknown>): Promise<void> {
  await request(`/templates/${world}/player`, { method: "PUT", body: JSON.stringify(data) });
}

export async function getPreferencesTemplate(world: string): Promise<Record<string, unknown>> {
  return request(`/templates/${world}/preferences`);
}

export async function updatePreferencesTemplate(world: string, data: Record<string, unknown>): Promise<void> {
  await request(`/templates/${world}/preferences`, { method: "PUT", body: JSON.stringify(data) });
}

export async function previewTemplate(world: string): Promise<{ preview: string }> {
  return request(`/templates/${world}/preview`);
}

export async function generateWorld(concept: string): Promise<{ world: string; files: string[] }> {
  return request("/templates/new", { method: "POST", body: JSON.stringify({ concept }) });
}

export async function newGame(world: string, player_name: string): Promise<{ game_id: string }> {
  return request("/game/new", { method: "POST", body: JSON.stringify({ world, player_name }) });
}

export async function startGame(gameId: string): Promise<GameActionResponse> {
  return request(`/game/${gameId}/start`, { method: "POST" });
}

export async function listGames(): Promise<GameListItem[]> {
  return request("/games");
}

export async function getGameHistory(gameId: string): Promise<GameSession> {
  return request(`/game/${gameId}/history`);
}

export async function sendAction(gameId: string, action: string): Promise<GameActionResponse> {
  return request(`/game/${gameId}/action`, { method: "POST", body: JSON.stringify({ action }) });
}

export async function sendActionStream(
  gameId: string,
  action: string,
  onChunk: (text: string) => void,
  onParsed: (suggestions: string[], state: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/game/${gameId}/action/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      signal,
    });
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No reader");
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") { onDone(); return; }
          try {
            const json = JSON.parse(data);
            if (json.error) { onError(json.error); return; }
            if (json.content) onChunk(json.content);
            if (json.parsed) onParsed(json.parsed.suggestions || [], json.parsed.state || {});
          } catch { /* skip */ }
        }
      }
    }
    onDone();
  } catch (e: unknown) {
    onError(e instanceof Error ? e.message : String(e));
  }
}

export async function deleteGame(gameId: string): Promise<void> {
  await request(`/game/${gameId}`, { method: "DELETE" });
}

export async function getGameTokens(gameId: string): Promise<TokenInfo> {
  return request(`/game/${gameId}/tokens`);
}
