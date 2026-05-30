import { useEffect, useState } from "react";
import type { GameListItem } from "../services/api";
import {
  listGames,
  newGame,
  startGame,
  deleteGame,
  listWorlds,
} from "../services/api";
import GameChat from "./GameChat";

interface Props {
  onBack?: () => void;
}

export default function GameView(_props: Props) {
  const [sessions, setSessions] = useState<GameListItem[]>([]);
  const [worlds, setWorlds] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState("冒险者");
  const [selectedWorld, setSelectedWorld] = useState("fantasy");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [games, tmpl] = await Promise.all([
        listGames(),
        listWorlds(),
      ]);
      setSessions(games);
      setWorlds(tmpl.worlds);
      if (tmpl.worlds.length > 0) setSelectedWorld(tmpl.worlds[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleNewGame() {
    try {
      setLoading(true);
      setError("");
      const { game_id } = await newGame(selectedWorld, playerName);
      await startGame(game_id);
      setActiveSession(game_id);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(gameId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteTarget(gameId);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGame(deleteTarget);
      setDeleteTarget(null);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleteTarget(null);
    }
  }

  if (activeSession) {
    return (
      <GameChat
        gameId={activeSession}
        playerName={playerName}
        onBack={() => {
          setActiveSession(null);
          loadAll();
        }}
      />
    );
  }

  return (
    <div className="game-sessions">
      <h2>AI Adventure</h2>

      {error && <div className="error-banner">{error}</div>}

      {deleteTarget && (
        <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Session?</h3>
            <p>
              This action cannot be undone. The session and all its messages
              will be permanently deleted.
            </p>
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          <h3
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Continue Playing
          </h3>
          <div className="session-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="session-item"
                onClick={() => setActiveSession(s.id)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3>
                      {s.player_name} - {s.world}
                    </h3>
                    <p>
                      Turn {s.turn} | Updated:{" "}
                      {new Date(s.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="danger"
                    onClick={(e) => handleDelete(s.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3
        style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        {sessions.length > 0 ? "Or Start a New Game" : "Start a New Game"}
      </h3>

      <div className="new-game-form">
        <input
          type="text"
          placeholder="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <select
          value={selectedWorld}
          onChange={(e) => setSelectedWorld(e.target.value)}
        >
          {worlds.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button onClick={handleNewGame} disabled={loading}>
          {loading ? "Creating..." : "New Game"}
        </button>
      </div>
    </div>
  );
}
