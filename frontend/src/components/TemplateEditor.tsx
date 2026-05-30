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
} from "../services/api";
import NewWorldDialog from "./NewWorldDialog";
import CorePreview from "./CorePreview";
import WorldFileEditor from "./WorldFileEditor";

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

  useEffect(() => void loadAll(), []);
  useEffect(() => {
    if (debugMode && !protocol) {
      Promise.all([getCoreProtocol(), getCoreSafety()])
        .then(([p, s]) => { setProtocol(p.protocol); setSafety(s.rules); })
        .catch(() => {});
    }
  }, [debugMode]);
  useEffect(() => {
    if (selectedWorld) loadWorldFiles(selectedWorld);
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

  const fileMap: Record<WorldFile, { data: string; update: (w: string, d: Record<string, unknown>) => Promise<void> }> = {
    world: { data: worldData, update: updateWorldTemplate },
    player: { data: playerData, update: updatePlayerTemplate },
    preferences: { data: preferencesData, update: updatePreferencesTemplate },
  };

  const dataSetters: Record<WorldFile, (v: string) => void> = {
    world: setWorldData,
    player: setPlayerData,
    preferences: setPreferencesData,
  };

  async function handleSave() {
    try {
      setSaving(true);
      const file = fileMap[activeFile];
      await file.update(selectedWorld, JSON.parse(file.data));
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

      {debugMode && <CorePreview protocol={protocol} safety={safety} />}

      {showNewWorld && (
        <NewWorldDialog
          onCreated={(world) => {
            setShowNewWorld(false);
            loadAll().then(() => setSelectedWorld(world));
          }}
          onError={(msg) => setStatus("error: " + msg)}
        />
      )}

      <WorldFileEditor
        worlds={worlds}
        selectedWorld={selectedWorld}
        onSelectWorld={setSelectedWorld}
        activeFile={activeFile}
        onSelectFile={setActiveFile}
        fileData={fileMap[activeFile].data}
        onFileDataChange={dataSetters[activeFile]}
        preview={preview}
        onSave={handleSave}
        saving={saving}
        status={status}
        onNewWorld={() => setShowNewWorld(true)}
      />
    </div>
  );
}
