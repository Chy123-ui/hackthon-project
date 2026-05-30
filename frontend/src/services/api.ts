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
  turn: number;
}

export interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export async function getConfig(): Promise<Config> {
  return request<Config>("/config");
}

export async function updateConfig(config: Config): Promise<void> {
  await request("/config", { method: "PUT", body: JSON.stringify(config) });
}

export async function listTemplates(): Promise<{ worlds: string[] }> {
  return request("/templates");
}

export async function getUserTemplate(world: string): Promise<Record<string, unknown>> {
  return request(`/templates/${world}/user`);
}

export async function updateUserTemplate(
  world: string,
  data: Record<string, unknown>
): Promise<void> {
  await request(`/templates/${world}/user`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getCoreTemplate(world: string): Promise<Record<string, unknown>> {
  return request(`/templates/${world}/core`);
}

export async function previewTemplate(world: string): Promise<{ preview: string }> {
  return request(`/templates/${world}/preview`);
}

export async function newGame(
  world: string,
  player_name: string
): Promise<{ game_id: string }> {
  return request("/game/new", {
    method: "POST",
    body: JSON.stringify({ world, player_name }),
  });
}

export async function listGames(): Promise<GameListItem[]> {
  return request("/games");
}

export async function getGameHistory(gameId: string): Promise<GameSession> {
  return request(`/game/${gameId}/history`);
}

export async function sendAction(
  gameId: string,
  action: string
): Promise<{ content: string; turn: number }> {
  return request(`/game/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function sendActionStream(
  gameId: string,
  action: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/game/${gameId}/action/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
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
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const json = JSON.parse(data);
            if (json.error) {
              onError(json.error);
              return;
            }
            if (json.content) onChunk(json.content);
          } catch {
            // skip malformed
          }
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
