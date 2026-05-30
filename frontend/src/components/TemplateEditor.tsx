import { useEffect, useState } from "react";
import {
  listWorlds,
  getWorldTemplate,
  updateWorldTemplate,
  getPlayerTemplate,
  updatePlayerTemplate,
  getPreferencesTemplate,
  updatePreferencesTemplate,
  previewTemplate,
  getCoreProtocol,
  getCoreSafety,
  generateWorld,
} from "../services/api";

type WorldFile = "world" | "player" | "preferences";

export default function TemplateEditor() {
  const [worlds, setWorlds] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState("");
  const [activeFile, setActiveFile] = useState<WorldFile>("world");
  const [debugMode, setDebugMode] = useState(false);

  const [worldData, setWorldData] = useState("");
  const [playerData, setPlayerData] = useState("");
  const [preferencesData, setPreferencesData] = useState("");
  const [preview, setPreview] = useState("");
  const [protocol, setProtocol] = useState("");
  const [safety, setSafety] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const [showNewWorld, setShowNewWorld] = useState(false);
  const [newConcept, setNewConcept] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (debugMode && !protocol) {
      Promise.all([getCoreProtocol(), getCoreSafety()])
        .then(([p, s]) => { setProtocol(p.protocol); setSafety(s.rules); })
        .catch(() => {});
    }
  }, [debugMode]);

  useEffect(() => {
    if (!selectedWorld) return;
    loadWorldFiles(selectedWorld);
  }, [selectedWorld]);

  async function loadAll() {
    try {
      const w = await listWorlds();
      setWorlds(w.worlds);
      if (w.worlds.length > 0 && !selectedWorld) setSelectedWorld(w.worlds[0]);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function loadWorldFiles(world: string) {
    try {
      const [wo, pl, pr, pv] = await Promise.all([
        getWorldTemplate(world),
        getPlayerTemplate(world),
        getPreferencesTemplate(world),
        previewTemplate(world),
      ]);
      setWorldData(JSON.stringify(wo, null, 2));
      setPlayerData(JSON.stringify(pl, null, 2));
      setPreferencesData(JSON.stringify(pr, null, 2));
      setPreview(pv.preview || "");
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleGenerate() {
    const concept = newConcept.trim();
    if (!concept) return;
    setGenerating(true);
    setStatus("");
    try {
      const result = await generateWorld(concept);
      setShowNewWorld(false);
      setNewConcept("");
      await loadAll();
      setSelectedWorld(result.world);
      setStatus("saved");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const fileMap: Record<WorldFile, { data: string; update: (w: string, d: Record<string, unknown>) => Promise<void> }> = {
        world: { data: worldData, update: updateWorldTemplate },
        player: { data: playerData, update: updatePlayerTemplate },
        preferences: { data: preferencesData, update: updatePreferencesTemplate },
      };
      const file = fileMap[activeFile];
      const parsed = JSON.parse(file.data);
      await file.update(selectedWorld, parsed);
      const p = await previewTemplate(selectedWorld);
      setPreview(p.preview || "");
      setStatus("saved");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  function getActiveData(): string {
    const map: Record<WorldFile, string> = {
      world: worldData,
      player: playerData,
      preferences: preferencesData,
    };
    return map[activeFile];
  }

  function setActiveData(value: string) {
    const setters: Record<WorldFile, (v: string) => void> = {
      world: setWorldData,
      player: setPlayerData,
      preferences: setPreferencesData,
    };
    setters[activeFile](value);
  }

  return (
    <div className="template-view">
      <h2>Template Manager</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={() => setDebugMode(!debugMode)}
            style={{ marginRight: 6, cursor: "pointer" }}
          />
          Debug Mode (show Core templates)
        </label>
      </div>

      {debugMode && protocol && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "var(--danger)", fontSize: 14, marginBottom: 8 }}>
            Core Templates (Read Only)
          </h3>
          <div className="template-row">
            <div className="template-column">
              <h3>Agent Protocol</h3>
              <textarea readOnly value={protocol} style={{ minHeight: 250 }} />
            </div>
            <div className="template-column">
              <h3>Safety Rules</h3>
              <textarea readOnly value={safety} style={{ minHeight: 250 }} />
            </div>
          </div>
        </div>
      )}

      {/* New World Dialog */}
      {showNewWorld && (
        <div style={{
          marginBottom: 16, padding: 16,
          background: "var(--bg-card)", border: "1px solid var(--accent)",
          borderRadius: "var(--radius)",
        }}>
          <h3 style={{ color: "var(--accent)", fontSize: 14, marginBottom: 8 }}>
            AI Generate New World
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
            Describe the world you want to create. The AI will generate world, player, and preferences templates.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder='e.g. "cyberpunk detective story in Neo Tokyo"'
              value={newConcept}
              onChange={(e) => setNewConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={generating}
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
                fontSize: 14,
              }}
            />
            <button className="primary" onClick={handleGenerate} disabled={generating || !newConcept.trim()}>
              {generating ? "Generating..." : "Generate"}
            </button>
            <button className="secondary" onClick={() => setShowNewWorld(false)} disabled={generating}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <button className="primary" onClick={() => setShowNewWorld(true)}>
            + New World
          </button>

          <select
            value={selectedWorld}
            onChange={(e) => setSelectedWorld(e.target.value)}
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
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {(["world", "player", "preferences"] as WorldFile[]).map((f) => (
            <button
              key={f}
              className={`tab-btn ${activeFile === f ? "active" : ""}`}
              onClick={() => setActiveFile(f)}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              {f}
            </button>
          ))}

          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : `Save ${activeFile}`}
          </button>
          {status === "saved" && <span className="status-badge saved">Saved</span>}
          {status.startsWith("error") && <span className="status-badge error">{status}</span>}
        </div>

        <div className="template-row">
          <div className="template-column">
            <h3>{activeFile}.yaml</h3>
            <textarea
              value={getActiveData()}
              onChange={(e) => setActiveData(e.target.value)}
              style={{ minHeight: 300 }}
            />
          </div>
          <div className="template-column">
            <h3>Rendered System Prompt Preview</h3>
            <textarea readOnly value={preview} style={{ minHeight: 300 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
