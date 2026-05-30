interface Props {
  suggestions: string[];
  gameState: Record<string, unknown>;
  onSuggestionClick: (text: string) => void;
  onSuggestionSend: (text: string) => void;
}

export default function StatePanel({
  suggestions,
  gameState,
  onSuggestionClick,
  onSuggestionSend,
}: Props) {
  if (suggestions.length === 0 && Object.keys(gameState).length === 0) {
    return null;
  }

  return (
    <div
      style={{
        width: 240,
        padding: 12,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        overflowY: "auto",
        fontSize: 13,
      }}
    >
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: "var(--accent)", marginBottom: 8 }}>
            Suggested Actions
          </h4>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => onSuggestionClick(s)}
              onDoubleClick={() => onSuggestionSend(s)}
              style={{
                padding: "6px 8px",
                marginBottom: 4,
                background: "var(--bg-card)",
                borderRadius: 4,
                cursor: "pointer",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}

      {Object.keys(gameState).length > 0 && (
        <div>
          <h4
            style={{
              color: "var(--text-secondary)",
              marginBottom: 8,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Game State
          </h4>
          {Object.entries(gameState).map(([key, value]) => (
            <div
              key={key}
              style={{
                marginBottom: 4,
                padding: "4px 8px",
                background: "var(--bg-card)",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {key}:{" "}
              </span>
              <span style={{ color: "var(--text)" }}>
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
