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
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    try {
      for (const id of selected) {
        await deleteGame(id);
      }
      setSelected(new Set());
      setMultiMode(false);
      await loadSessions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
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
    <div style={{ padding: 32, overflowY: "auto", maxWidth: 700, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: "var(--accent)", fontSize: 24, margin: 0 }}>历史记录</h2>
        <button className="secondary" onClick={() => { setMultiMode(!multiMode); setSelected(new Set()); }}>
          {multiMode ? "取消" : "选择"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {deleteTarget && (
        <ConfirmDeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {multiMode && selected.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 12,
          background: "rgba(124,92,191,0.1)",
          border: "1px solid var(--accent)", borderRadius: "var(--radius)",
        }}>
          <span style={{ fontSize: 13, color: "var(--accent)" }}>
            {selected.size} 已选
          </span>
          <div style={{ flex: 1 }} />
          <button className="danger" onClick={handleBulkDelete} style={{ fontSize: 13 }}>
            删除已选
          </button>
        </div>
      )}

      {visibleSessions.length > 0 && (
        <SessionList
          sessions={visibleSessions}
          onOpen={(session) => {
            if (multiMode) return;
            setActiveSession(session);
          }}
          onDelete={handleDelete}
          multiSelect={multiMode}
          selected={selected}
          onSelectToggle={toggleSelect}
        />
      )}

      {visibleSessions.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: 40 }}>
          No stories found.
        </p>
      )}
    </div>
  );
}
