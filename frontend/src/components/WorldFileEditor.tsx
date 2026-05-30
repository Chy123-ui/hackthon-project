import { useRef, useState } from "react";

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
  onAiAssist: () => void;
}

const fileLabels: WorldFile[] = ["world", "player", "preferences"];

export default function WorldFileEditor({
  worlds, selectedWorld, onSelectWorld, activeFile, onSelectFile,
  fileData, onFileDataChange, preview, onSave, saving, status, onAiAssist,
}: Props) {
  const [fullscreen, setFullscreen] = useState<"edit" | "preview" | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  function autoResize(ref: React.RefObject<HTMLTextAreaElement | null>) {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.max(300, el.scrollHeight)}px`; }
  }

  if (fullscreen === "edit") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "var(--bg)", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h3>{activeFile}.yaml</h3>
          <button className="secondary" onClick={() => setFullscreen(null)}>Close</button>
        </div>
        <textarea
          ref={editRef}
          value={fileData}
          onChange={(e) => { onFileDataChange(e.target.value); autoResize(editRef); }}
          style={{ flex: 1, padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14, resize: "none" }}
        />
      </div>
    );
  }

  if (fullscreen === "preview") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "var(--bg)", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h3>System Prompt Preview</h3>
          <button className="secondary" onClick={() => setFullscreen(null)}>Close</button>
        </div>
        <textarea readOnly value={preview} style={{ flex: 1, padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14, resize: "none" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <select value={selectedWorld} onChange={(e) => onSelectWorld(e.target.value)}
          style={{ padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontSize: 14, minWidth: 150 }}>
          {worlds.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        {fileLabels.map((f) => (
          <button key={f} className={`tab-btn ${activeFile === f ? "active" : ""}`} onClick={() => onSelectFile(f)} style={{ padding: "8px 16px", fontSize: 13 }}>{f}</button>
        ))}
        <button className="secondary" onClick={onAiAssist} style={{ fontSize: 13 }}>AI Modify</button>
        <button className="primary" onClick={onSave} disabled={saving}>{saving ? "Saving..." : `Save ${activeFile}`}</button>
        {status === "saved" && <span className="status-badge saved">Saved</span>}
        {status.startsWith("error") && <span className="status-badge error">{status}</span>}
      </div>

      <div className="template-row">
        <div className="template-column" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>{activeFile}.yaml</h3>
            <button className="secondary" onClick={() => setFullscreen("edit")} style={{ fontSize: 11, padding: "2px 8px" }}>Full</button>
          </div>
          <textarea ref={editRef} value={fileData}
            onChange={(e) => { onFileDataChange(e.target.value); autoResize(editRef); }}
            onFocus={() => autoResize(editRef)}
            style={{ minHeight: 300, padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, resize: "none", overflow: "hidden" }}
          />
        </div>
        <div className="template-column" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>System Prompt Preview</h3>
            <button className="secondary" onClick={() => setFullscreen("preview")} style={{ fontSize: 11, padding: "2px 8px" }}>Full</button>
          </div>
          <textarea ref={previewRef} readOnly value={preview}
            onFocus={() => autoResize(previewRef)}
            style={{ minHeight: 300, padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, resize: "none", overflow: "hidden" }}
          />
        </div>
      </div>
    </div>
  );
}
