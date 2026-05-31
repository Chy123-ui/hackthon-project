import { useEffect, useState } from "react";
import {
  listWorlds, getWorldTemplate,
  getPlayerTemplate, getPreferencesTemplate,
  saveTemplate, previewTemplate,
  exportWorld, deleteWorld, modifyWorld, getModifySuggestions,
} from "../services/api";
import NewWorldDialog from "./NewWorldDialog";
import WorldFileEditor from "./WorldFileEditor";
import TemplateList from "./TemplateList";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

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
  const [aiModifying, setAiModifying] = useState(false);
  const [aiLoadingSuggestions, setAiLoadingSuggestions] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => void loadAll(), []);

  async function loadAll() {
    try { const w = await listWorlds(); setWorlds(w.worlds); }
    catch (e: unknown) { setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e))); }
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
    } catch (e: unknown) { setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e))); }
  }

  const fileMap: Record<WorldFile, { data: string }> = {
    world: { data: worldData },
    player: { data: playerData },
    preferences: { data: preferencesData },
  };
  const dataSetters: Record<WorldFile, (v: string) => void> = { world: setWorldData, player: setPlayerData, preferences: setPreferencesData };

  async function handleSave() {
    try {
      setSaving(true);
      await saveTemplate(
        selectedWorld,
        JSON.parse(worldData),
        JSON.parse(playerData),
        JSON.parse(preferencesData),
      );
      const p = await previewTemplate(selectedWorld);
      setPreview(p.preview || "");
      setStatus("\u5df2\u4fdd\u5b58"); setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) { setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  }

  async function handleExport(w: string) {
    try {
      const data = await exportWorld(w);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${w}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) { setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e))); }
  }

  async function handleAiAssist() {
    const instr = aiInstruction.trim() || (aiSuggestions.length > 0 ? aiSuggestions[0] : "");
    if (!instr) return;
    setAiInstruction("");
    setAiModifying(true);
    setStatus("AI \u4fee\u6539\u4e2d...");
    try {
      const result = await modifyWorld(selectedWorld, instr);
      setAiHistory((prev) => [...prev.slice(-9), instr]);
      await loadAll();
      openEditor(result.world);
      setStatus("AI \u4fee\u6539\u5b8c\u6210");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setAiModifying(false);
    }
  }

  /* ---- editing view ---- */
  if (editing && selectedWorld) {
    return (
      <div className="template-view">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2>编辑: {selectedWorld}</h2>
          <button className="secondary" onClick={() => { setEditing(false); loadAll(); }}>
            返回模板
          </button>
        </div>

        {showAiAssist && (
          <div style={{
            marginBottom: 16, padding: 16, background: "var(--bg-card)",
            border: "1px solid var(--accent)", borderRadius: "var(--radius)",
            opacity: aiModifying ? 0.6 : 1, pointerEvents: aiModifying ? "none" : "auto",
          }}>
            <h3 style={{ color: "var(--accent)", fontSize: 14, marginBottom: 8 }}>
              AI 修改 "{selectedWorld}" {aiModifying && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>— 处理中...</span>}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
              描述你想要的变化，AI 将修改当前模板。
            </p>

            {aiLoadingSuggestions && (
              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 8 }}>加载建议中...</p>
            )}
            {aiSuggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {aiSuggestions.map((s, i) => (
                  <span key={i} onClick={() => { setAiInstruction(s); handleAiAssist(); }}
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
                    else if (aiSuggestions.length > 0) { setAiInstruction(aiSuggestions[0]); handleAiAssist(); }
                  }
                }}
                disabled={aiModifying}
                placeholder={aiSuggestions.length > 0 ? "点击建议或输入修改内容" : "描述你的修改..."}
                style={{
                  flex: 1, padding: "10px 14px", background: "var(--bg-input)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <button className="primary" onClick={handleAiAssist} disabled={aiModifying}>
                {aiModifying ? "修改中..." : "修改"}
              </button>
              <button className="secondary" onClick={() => { setShowAiAssist(false); setAiInstruction(""); setAiSuggestions([]); }}
                disabled={aiModifying}>取消</button>
            </div>

            {aiHistory.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 6 }}>最近修改:</p>
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
            setAiLoadingSuggestions(true);
            getModifySuggestions(selectedWorld).then((r) => {
              setAiSuggestions(r.suggestions);
              setAiLoadingSuggestions(false);
            }).catch(() => setAiLoadingSuggestions(false));
          }}
        />
      </div>
    );
  }

  function toggleSelect(w: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    try {
      for (const w of selected) {
        await deleteWorld(w);
      }
      setSelected(new Set());
      setMultiMode(false);
      setStatus("\u5df2\u5220\u9664");
      setTimeout(() => setStatus(""), 2000);
      await loadAll();
    } catch (e: unknown) {
      setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteWorld(deleteTarget);
      setDeleteTarget(null);
      setStatus("\u5df2\u5220\u9664"); setTimeout(() => setStatus(""), 2000);
      await loadAll();
    } catch (e: unknown) {
      setStatus("\u9519\u8bef: " + (e instanceof Error ? e.message : String(e)));
      setDeleteTarget(null);
    }
  }

  /* ---- list view ---- */
  const keyword = searchQuery.trim().toLowerCase();
  const visibleWorlds = keyword ? worlds.filter((w) => w.toLowerCase().includes(keyword)) : worlds;

  return (
    <>
      <TemplateList
        worlds={visibleWorlds} selectedWorld={selectedWorld}
        onSelect={openEditor} onNewWorld={() => { setShowNewWorld(true); setShowAiAssist(false); }}
        onExport={handleExport}
        onDelete={async (w) => { setDeleteTarget(w); }}
        multiSelect={multiMode}
        selected={selected}
        onSelectToggle={toggleSelect}
        onSelectAll={() => setSelected(new Set(visibleWorlds))}
        onToggleMulti={() => { setMultiMode(!multiMode); setSelected(new Set()); }}
        multiMode={multiMode}
        selectedCount={selected.size}
        onBulkDelete={handleBulkDelete}
      />
      {showNewWorld && <NewWorldDialog onCreated={(w) => { setShowNewWorld(false); loadAll().then(() => openEditor(w)); }} onError={(msg) => setStatus("\u9519\u8bef: " + msg)} onClose={() => setShowNewWorld(false)} />}
      {deleteTarget && (
        <ConfirmDeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
      {status && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 24px", borderRadius: "var(--radius)", background: status.startsWith("\u9519\u8bef") ? "var(--danger)" : "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 1000 }}>
          {status}
        </div>
      )}
    </>
  );
}
