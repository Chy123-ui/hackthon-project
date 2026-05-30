import { useEffect, useState } from "react";
import {
  listTemplates,
  getUserTemplate,
  updateUserTemplate,
  getCoreTemplate,
  previewTemplate,
} from "../services/api";

export default function TemplateEditor() {
  const [worlds, setWorlds] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState("");
  const [coreYaml, setCoreYaml] = useState("");
  const [userYaml, setUserYaml] = useState("");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    listTemplates().then((data) => {
      setWorlds(data.worlds);
      if (data.worlds.length > 0) {
        setSelectedWorld(data.worlds[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedWorld) return;
    loadTemplates(selectedWorld);
  }, [selectedWorld]);

  async function loadTemplates(world: string) {
    try {
      const [core, user] = await Promise.all([
        getCoreTemplate(world),
        getUserTemplate(world),
      ]);
      setCoreYaml(JSON.stringify(core, null, 2));
      setUserYaml(JSON.stringify(user, null, 2));
      const p = await previewTemplate(world);
      setPreview(p.preview);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const parsed = JSON.parse(userYaml);
      await updateUserTemplate(selectedWorld, parsed);
      setStatus("saved");
      const p = await previewTemplate(selectedWorld);
      setPreview(p.preview);
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

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          }}
        >
          {worlds.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save User Template"}
        </button>
        {status === "saved" && (
          <span className="status-badge saved">Saved</span>
        )}
        {status.startsWith("error") && (
          <span className="status-badge error">{status}</span>
        )}
      </div>

      <div className="template-row">
        <div className="template-column">
          <h3>Core Template (Locked)</h3>
          <textarea readOnly value={coreYaml} />
        </div>
        <div className="template-column">
          <h3>User Template (Editable)</h3>
          <textarea
            value={userYaml}
            onChange={(e) => setUserYaml(e.target.value)}
          />
        </div>
        <div className="template-column">
          <h3>Merged Preview</h3>
          <textarea readOnly value={preview} />
        </div>
      </div>
    </div>
  );
}
