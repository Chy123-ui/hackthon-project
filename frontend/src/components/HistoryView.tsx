import { useEffect, useState } from "react";
import type { GameListItem } from "../services/api";
import { deleteGame, listGames } from "../services/api";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import GameChat from "./GameChat";
import SessionList, { filterSessions, sortByUpdatedDesc } from "./SessionList";

interface Props {
  searchQuery?: string;
}

export default function HistoryView({ searchQuery = "" }: Props) {
  const [sessions, setSessions] = useState<GameListItem[]>([]);
  const [activeSession, setActiveSession] = useState<GameListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const games = await listGames();
      setSessions(sortByUpdatedDesc(games));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
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
      if (activeSession?.id === deleteTarget) setActiveSession(null);
      await loadSessions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleteTarget(null);
    }
  }

  if (activeSession) {
    return (
      <GameChat
        gameId={activeSession.id}
        playerName={activeSession.player_name}
        onBack={() => {
          setActiveSession(null);
          loadSessions();
        }}
      />
    );
  }

  const visibleSessions = filterSessions(sessions, searchQuery);

  return (
    <div className="game-sessions">
      <h2>History</h2>

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
            All Stories
          </h3>
          <SessionList
            sessions={visibleSessions}
            onOpen={setActiveSession}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
