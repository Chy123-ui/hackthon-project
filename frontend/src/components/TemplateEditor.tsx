import { useEffect, useRef, useState } from "react";
import {
  listWorlds,
  getWorldTemplate,
  updateWorldTemplate,
  getPlayerTemplate,
  updatePlayerTemplate,
  getPreferencesTemplate,
  updatePreferencesTemplate,
  previewTemplate,
  exportWorld,
  importWorld,
} from "../services/api";
import NewWorldDialog from "./NewWorldDialog";
import WorldFileEditor from "./WorldFileEditor";
import TemplateList from "./TemplateList";

type WorldFile = "world" | "player" | "preferences";

export default function TemplateEditor() {
  const [worlds, setWorlds] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState("");
  const [activeFile, setActiveFile] = useState<WorldFile>("world");
  const [editing, setEditing] = useState(false);

  const [worldData, setWorldData] = useState("");
  const [playerData, setPlayerData] = useState("");
  const [preferencesData, setPreferencesData] = useState("");
  const [preview, setPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [showNewWorld, setShowNewWorld] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => void loadAll(), []);

  async function loadAll() {
    try {
      const w = await listWorlds();
      setWorlds(w.worlds);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function openEditor(world: string) {
    setSelectedWorld(world);
    setEditing(true);
    loadWorldFiles(world);
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

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      setStatus("Importing...");
      const text = await file.text();
      const result = await importWorld(text, file.name);
      await loadAll();
      openEditor(result.world);
      setStatus("imported");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleExport(world: string) {
    try {
      const data = await exportWorld(world);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${world}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  if (editing && selectedWorld) {
    return (
      <div className="template-view">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2>Editing: {selectedWorld}</h2>
          <button className="secondary" onClick={() => { setEditing(false); loadAll(); }}>
            Back to Templates
          </button>
        </div>

        <WorldFileEditor
          worlds={worlds}
          selectedWorld={selectedWorld}
          onSelectWorld={(w) => { setSelectedWorld(w); loadWorldFiles(w); }}
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

        {showNewWorld && (
          <NewWorldDialog
            onCreated={(world) => {
              setShowNewWorld(false);
              loadAll().then(() => openEditor(world));
            }}
            onError={(msg) => setStatus("error: " + msg)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <TemplateList
        worlds={worlds}
        selectedWorld={selectedWorld}
        onSelect={openEditor}
        onNewWorld={() => setShowNewWorld(true)}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
      />

      {showNewWorld && (
        <NewWorldDialog
          onCreated={(world) => {
            setShowNewWorld(false);
            loadAll().then(() => openEditor(world));
          }}
          onError={(msg) => setStatus("error: " + msg)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.json,.yaml,.md"
        style={{ display: "none" }}
        onChange={handleImport}
      />

      {status.startsWith("error") && (
        <div style={{ padding: "8px 16px", color: "var(--danger)", fontSize: 13 }}>
          {status}
        </div>
      )}
    </>
  );
}
