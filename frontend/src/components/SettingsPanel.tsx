import { useEffect, useState } from "react";
import type { Config } from "../services/api";
import { getConfig, updateConfig } from "../services/api";

interface Props {
  searchQuery?: string;
}

export default function SettingsPanel({ searchQuery = "" }: Props) {
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

  const fields: { key: keyof Config; label: string; type: string; placeholder: string }[] = [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-..." },
    { key: "base_url", label: "Base URL", type: "text", placeholder: "https://api.openai.com/v1" },
    { key: "model", label: "Model", type: "text", placeholder: "gpt-4o" },
    { key: "max_tokens", label: "Max Tokens", type: "number", placeholder: "4096" },
    { key: "temperature", label: "Temperature", type: "number", placeholder: "0.8" },
  ];

  const kw = searchQuery.trim().toLowerCase();
  const visibleFields = kw ? fields.filter((f) => f.label.toLowerCase().includes(kw) || f.key.toLowerCase().includes(kw)) : fields;

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

      {visibleFields.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No matching settings found.</p>
      )}

      {visibleFields.map((f) => (
        <div className="form-group" key={f.key}>
          <label>{f.label}</label>
          <input
            type={f.type}
            placeholder={f.placeholder}
            value={String(config[f.key] ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              setConfig({ ...config, [f.key]: f.key === "max_tokens" || f.key === "temperature" ? (v ? Number(v) : undefined) : v });
            }}
          />
        </div>
      ))}

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
