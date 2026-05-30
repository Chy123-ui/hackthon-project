import { useEffect, useState } from "react";
import type { Config } from "../services/api";
import { getConfig, updateConfig } from "../services/api";

export default function SettingsPanel() {
  const [config, setConfig] = useState<Config>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch((e: unknown) => {
        setStatus("error: " + (e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      await updateConfig(config);
      setStatus("saved");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: unknown) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      {loading && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Loading...</p>
      )}

      {status.startsWith("error") && (
        <div style={{
          padding: "8px 12px", marginBottom: 16,
          background: "rgba(212,90,90,0.1)",
          border: "1px solid var(--danger)",
          borderRadius: "var(--radius)",
          color: "var(--danger)", fontSize: 13,
        }}>
          {status}
        </div>
      )}

      <div className="form-group">
        <label>API Key</label>
        <input
          type="password"
          placeholder="sk-..."
          value={config.api_key ?? ""}
          onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Base URL</label>
        <input
          type="text"
          placeholder="https://api.openai.com/v1"
          value={config.base_url ?? ""}
          onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Model</label>
        <input
          type="text"
          placeholder="gpt-4o"
          value={config.model ?? ""}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Max Tokens</label>
        <input
          type="number"
          placeholder="4096"
          value={config.max_tokens ?? ""}
          onChange={(e) =>
            setConfig({ ...config, max_tokens: Number(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label>Temperature</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="2"
          placeholder="0.8"
          value={config.temperature ?? ""}
          onChange={(e) =>
            setConfig({ ...config, temperature: Number(e.target.value) })
          }
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {status === "saved" && (
          <span className="status-badge saved">Saved</span>
        )}
      </div>
    </div>
  );
}
