import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect";

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

  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  if (fullscreen === "edit") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "var(--bg)", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h3>{activeFile}.yaml</h3>
          <button className="secondary" onClick={() => setFullscreen(null)}>关闭</button>
        </div>
        <textarea
          value={fileData}
          onChange={(e) => onFileDataChange(e.target.value)}
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
          <button className="secondary" onClick={() => setFullscreen(null)}>关闭</button>
        </div>
        <textarea readOnly value={preview} style={{ flex: 1, padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14, resize: "none" }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <CustomSelect
          className="world-select"
          value={selectedWorld}
          onChange={onSelectWorld}
          options={worlds}
        />
        {fileLabels.map((f) => (
          <button key={f} className={`tab-btn ${activeFile === f ? "active" : ""}`} onClick={() => onSelectFile(f)} style={{ padding: "8px 16px", fontSize: 13 }}>{f}</button>
        ))}
        <button className="secondary" onClick={onAiAssist} style={{ fontSize: 13 }}>AI 修改</button>
        <button className="primary" onClick={onSave} disabled={saving}>{saving ? "保存中..." : "保存模板"}</button>
        {status === "\u5df2\u4fdd\u5b58" && <span className="status-badge saved">\u5df2\u4fdd\u5b58</span>}
        {status.startsWith("\u9519\u8bef") && <span className="status-badge error">{status}</span>}
      </div>

      <div className="template-row">
        <div className="template-column" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>{activeFile}.yaml</h3>
            <button className="secondary" onClick={() => setFullscreen("edit")} style={{ fontSize: 11, padding: "2px 8px" }}>全屏</button>
          </div>
          <textarea value={fileData}
            onChange={(e) => onFileDataChange(e.target.value)}
            style={{ padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, resize: "none", overflowY: "auto" }}
          />
        </div>
        <div className="template-column" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>提示词预览</h3>
            <button className="secondary" onClick={() => setFullscreen("preview")} style={{ fontSize: 11, padding: "2px 8px" }}>全屏</button>
          </div>
          <textarea readOnly value={preview}
            style={{ padding: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, resize: "none", overflowY: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
