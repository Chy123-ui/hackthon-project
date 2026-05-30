type WorldFile = "world" | "player" | "preferences";

interface Props {
  worlds: string[];
  selectedWorld: string;
  onSelectWorld: (w: string) => void;
  activeFile: WorldFile;
  onSelectFile: (f: WorldFile) => void;
  fileData: string;
  onFileDataChange: (v: string) => void;
  preview: string;
  onSave: () => void;
  saving: boolean;
  status: string;
  onNewWorld: () => void;
}

const fileLabels: WorldFile[] = ["world", "player", "preferences"];

export default function WorldFileEditor({
  worlds,
  selectedWorld,
  onSelectWorld,
  activeFile,
  onSelectFile,
  fileData,
  onFileDataChange,
  preview,
  onSave,
  saving,
  status,
  onNewWorld,
}: Props) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button className="primary" onClick={onNewWorld}>
          + New World
        </button>

        <select
          value={selectedWorld}
          onChange={(e) => onSelectWorld(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text)",
            fontSize: 14,
            minWidth: 150,
          }}
        >
          {worlds.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        {fileLabels.map((f) => (
          <button
            key={f}
            className={`tab-btn ${activeFile === f ? "active" : ""}`}
            onClick={() => onSelectFile(f)}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {f}
          </button>
        ))}

        <button className="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : `Save ${activeFile}`}
        </button>
        {status === "saved" && <span className="status-badge saved">Saved</span>}
        {status.startsWith("error") && (
          <span className="status-badge error">{status}</span>
        )}
      </div>

      <div className="template-row">
        <div className="template-column">
          <h3>{activeFile}.yaml</h3>
          <textarea
            value={fileData}
            onChange={(e) => onFileDataChange(e.target.value)}
            style={{ minHeight: 300 }}
          />
        </div>
        <div className="template-column">
          <h3>Rendered System Prompt Preview</h3>
          <textarea readOnly value={preview} style={{ minHeight: 300 }} />
        </div>
      </div>
    </div>
  );
}
