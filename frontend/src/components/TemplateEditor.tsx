import { useEffect, useRef, useState } from "react";
import {
  listWorlds, getWorldTemplate, updateWorldTemplate,
  getPlayerTemplate, updatePlayerTemplate, getPreferencesTemplate,
  updatePreferencesTemplate, previewTemplate,
  exportWorld, importWorld, deleteWorld, generateWorld, getModifySuggestions,
} from "../services/api";
import NewWorldDialog, { MODIFY_EXAMPLES } from "./NewWorldDialog";
import WorldFileEditor from "./WorldFileEditor";
import TemplateList from "./TemplateList";

type WorldFile = "world" | "player" | "preferences";

interface Props { searchQuery?: string; }

export default function TemplateEditor({ searchQuery = "" }: Props) {
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
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modifyExample = useRef(MODIFY_EXAMPLES[Math.floor(Math.random() * MODIFY_EXAMPLES.length)]);

  useEffect(() => void loadAll(), []);

  async function loadAll() {
    try { const w = await listWorlds(); setWorlds(w.worlds); }
    catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); }
  }

  function openEditor(world: string) { setSelectedWorld(world); setEditing(true); loadWorldFiles(world); }

  async function loadWorldFiles(world: string) {
    try {
      const [wo, pl, pr, pv] = await Promise.all([
        getWorldTemplate(world), getPlayerTemplate(world),
        getPreferencesTemplate(world), previewTemplate(world),
      ]);
      setWorldData(JSON.stringify(wo, null, 2));
      setPlayerData(JSON.stringify(pl, null, 2));
      setPreferencesData(JSON.stringify(pr, null, 2));
      setPreview(pv.preview || "");
    } catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); }
  }

  const fileMap: Record<WorldFile, { data: string; update: (w: string, d: Record<string, unknown>) => Promise<void> }> = {
    world: { data: worldData, update: updateWorldTemplate },
    player: { data: playerData, update: updatePlayerTemplate },
    preferences: { data: preferencesData, update: updatePreferencesTemplate },
  };
  const dataSetters: Record<WorldFile, (v: string) => void> = { world: setWorldData, player: setPlayerData, preferences: setPreferencesData };

  async function handleSave() {
    try {
      setSaving(true);
      await fileMap[activeFile].update(selectedWorld, JSON.parse(fileMap[activeFile].data));
      const p = await previewTemplate(selectedWorld);
      setPreview(p.preview || "");
      setStatus("saved"); setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      setStatus("Importing...");
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const binary = ["docx", "doc"].includes(ext);
      let content: string;
      if (binary) { const buf = await file.arrayBuffer(); content = btoa(String.fromCharCode(...new Uint8Array(buf))); }
      else { content = await file.text(); }
      const result = await importWorld({ content, filename: file.name, binary });
      await loadAll(); openEditor(result.world);
      setStatus("imported"); setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); }
  }

  async function handleExport(w: string) {
    try {
      const data = await exportWorld(w);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${w}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); }
  }

  async function handleAiAssist() {
    const instr = aiInstruction.trim();
    if (!instr) return;
    setAiInstruction("");
    setStatus("AI is modifying...");
    try {
      const concept = `Modify ${selectedWorld} world template. Current content: ${fileMap[activeFile].data}. Instruction: ${instr}. Return ONLY the updated YAML in same format.`;
      const result = await generateWorld(concept);
      setAiHistory((prev) => [...prev.slice(-9), instr]);
      await loadAll();
      openEditor(result.world);
      setStatus("AI modified successfully");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  /* ---- editing view ---- */
  if (editing && selectedWorld) {
    return (
      <div className="template-view">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2>Editing: {selectedWorld}</h2>
          <button className="secondary" onClick={() => { setEditing(false); loadAll(); }}>
            Back to Templates
          </button>
        </div>

        {showAiAssist && (
          <div style={{
            marginBottom: 16, padding: 16, background: "var(--bg-card)",
            border: "1px solid var(--accent)", borderRadius: "var(--radius)",
          }}>
            <h3 style={{ color: "var(--accent)", fontSize: 14, marginBottom: 8 }}>
              AI Modify "{selectedWorld}"
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
              Describe what changes you want. AI will modify the current template.
            </p>

            {aiSuggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {aiSuggestions.map((s, i) => (
                  <span key={i} onClick={() => setAiInstruction(s)}
                    style={{ padding: "4px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "var(--text)" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const txt = aiInstruction.trim();
                    if (txt) { handleAiAssist(); }
                    else { setAiInstruction(modifyExample.current); }
                  }
                }}
                placeholder={`e.g. "${modifyExample.current}"`}
                style={{
                  flex: 1, padding: "10px 14px", background: "var(--bg-input)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <button className="primary" onClick={handleAiAssist}>Modify</button>
              <button className="secondary" onClick={() => { setShowAiAssist(false); setAiInstruction(""); setAiSuggestions([]); }}>Cancel</button>
            </div>

            {aiHistory.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 6 }}>Recent changes:</p>
                {[...aiHistory].reverse().map((h, i) => (
                  <div key={i} style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>{h}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <WorldFileEditor
          worlds={worlds} selectedWorld={selectedWorld}
          onSelectWorld={(w) => { setSelectedWorld(w); loadWorldFiles(w); }}
          activeFile={activeFile} onSelectFile={setActiveFile}
          fileData={fileMap[activeFile].data} onFileDataChange={dataSetters[activeFile]}
          preview={preview} onSave={handleSave} saving={saving} status={status}
          onAiAssist={() => {
            setShowAiAssist(true);
            getModifySuggestions(selectedWorld).then((r) => setAiSuggestions(r.suggestions)).catch(() => {});
          }}
        />
      </div>
    );
  }

  /* ---- list view ---- */
  const keyword = searchQuery.trim().toLowerCase();
  const visibleWorlds = keyword ? worlds.filter((w) => w.toLowerCase().includes(keyword)) : worlds;

  return (
    <>
      <TemplateList
        worlds={visibleWorlds} selectedWorld={selectedWorld}
        onSelect={openEditor} onNewWorld={() => setShowNewWorld(true)}
        onImport={() => fileInputRef.current?.click()} onExport={handleExport}
        onDelete={async (w) => { try { await deleteWorld(w); setStatus("deleted"); setTimeout(() => setStatus(""), 2000); await loadAll(); } catch (e: unknown) { setStatus("error: " + (e instanceof Error ? e.message : String(e))); } }}
      />
      {showNewWorld && <NewWorldDialog onCreated={(w) => { setShowNewWorld(false); loadAll().then(() => openEditor(w)); }} onError={(msg) => setStatus("error: " + msg)} />}
      <input ref={fileInputRef} type="file" accept=".txt,.json,.yaml,.md,.docx,.doc" style={{ display: "none" }} onChange={handleImport} />
      {status && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 24px", borderRadius: "var(--radius)", background: status.startsWith("error") ? "var(--danger)" : "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 1000 }}>
          {status}
        </div>
      )}
    </>
  );
}
