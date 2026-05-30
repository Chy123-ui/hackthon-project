import { useEffect, useRef, useState } from "react";
import type { GameListItem } from "../services/api";
import {
  listGames,
  newGame,
  startGame,
  deleteGame,
  listWorlds,
  getPlayerTemplate,
} from "../services/api";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import GameChat from "./GameChat";
import SessionList, { filterSessions, sortByUpdatedDesc } from "./SessionList";

interface Props {
  searchQuery?: string;
}

export default function GameView({ searchQuery = "" }: Props) {
  const [sessions, setSessions] = useState<GameListItem[]>([]);
  const [worlds, setWorlds] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [placeholderName, setPlaceholderName] = useState("");
  const [selectedWorld, setSelectedWorld] = useState("fantasy");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [activePlayerName, setActivePlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const defaultNameRef = useRef("冒险者");
  const firstLoadRef = useRef(true);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (firstLoadRef.current) { firstLoadRef.current = false; return; }
    getPlayerTemplate(selectedWorld)
      .then((data) => {
        const name = data && typeof data === "object" && "name" in data
          ? String((data as Record<string, unknown>).name)
          : "";
        if (name) {
          setPlaceholderName(name);
          defaultNameRef.current = name;
        }
      })
      .catch(() => {});
  }, [selectedWorld]);

  async function loadAll() {
    try {
      const [games, tmpl] = await Promise.all([
        listGames(),
        listWorlds(),
      ]);
      setSessions(sortByUpdatedDesc(games));
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
      const name = playerName.trim() || defaultNameRef.current;
      const { game_id } = await newGame(selectedWorld, name);
      await startGame(game_id);
      setActiveSession(game_id);
      setActivePlayerName(name);
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
        playerName={activePlayerName}
        onBack={() => {
          setActiveSession(null);
          setActivePlayerName("");
          loadAll();
        }}
      />
    );
  }

  const visibleSessions = filterSessions(sessions, searchQuery).slice(0, 3);

  return (
    <div className="game-sessions">
      <h2>AI Adventure</h2>

      {error && <div className="error-banner">{error}</div>}

      {deleteTarget && (
        <ConfirmDeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {visibleSessions.length > 0 && (
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
          <SessionList
            sessions={visibleSessions}
            onOpen={(session) => { setActiveSession(session.id); setActivePlayerName(session.player_name); }}
            onDelete={handleDelete}
          />
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
          placeholder={placeholderName}
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
