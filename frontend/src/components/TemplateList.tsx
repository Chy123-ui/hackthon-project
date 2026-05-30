interface Props {
  worlds: string[];
  selectedWorld: string;
  onSelect: (world: string) => void;
  onNewWorld: () => void;
  onImport: () => void;
}

export default function TemplateList({
  worlds,
  selectedWorld,
  onSelect,
  onNewWorld,
  onImport,
}: Props) {
  return (
    <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
      <h2
        style={{
          color: "var(--accent)",
          fontSize: 20,
          marginBottom: 16,
        }}
      >
        Template Manager
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="primary" onClick={onNewWorld}>
          + New World
        </button>
        <button className="secondary" onClick={onImport}>
          Import .txt
        </button>
      </div>

      {worlds.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          No worlds yet. Create or import one.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {worlds.map((w) => (
          <div
            key={w}
            onClick={() => onSelect(w)}
            style={{
              padding: 16,
              background:
                w === selectedWorld ? "rgba(124,92,191,0.1)" : "var(--bg-card)",
              border:
                w === selectedWorld
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <h3 style={{ fontSize: 16, color: "var(--text)", marginBottom: 4 }}>
              {w}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              world / player / preferences
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
