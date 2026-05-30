import type { GameListItem } from "../services/api";

interface Props {
  sessions: GameListItem[];
  onOpen: (session: GameListItem) => void;
  onDelete: (gameId: string, e: React.MouseEvent) => void;
}

export function sortByUpdatedDesc(sessions: GameListItem[]) {
  return [...sessions].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function filterSessions(sessions: GameListItem[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return sessions;

  return sessions.filter((session) => {
    return (
      session.player_name.toLowerCase().includes(keyword) ||
      session.world.toLowerCase().includes(keyword)
    );
  });
}

export default function SessionList({ sessions, onOpen, onDelete }: Props) {
  return (
    <div className="session-list">
      {sessions.map((s) => (
        <div key={s.id} className="session-item" onClick={() => onOpen(s)}>
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
                Turn {s.turn} | Updated: {new Date(s.updated_at).toLocaleString()}
              </p>
            </div>
            <button className="danger" onClick={(e) => onDelete(s.id, e)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
