import { useState } from "react";
import { generateWorld } from "../services/api";

interface Props {
  onCreated: (world: string) => void;
  onError: (msg: string) => void;
}

export default function NewWorldDialog({ onCreated, onError }: Props) {
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    const c = concept.trim();
    if (!c) return;
    setGenerating(true);
    try {
      const result = await generateWorld(c);
      setConcept("");
      onCreated(result.world);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        background: "var(--bg-card)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius)",
      }}
    >
      <h3 style={{ color: "var(--accent)", fontSize: 14, marginBottom: 8 }}>
        AI Generate New World
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
        Describe the world concept. AI will generate world, player, and preferences templates.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder='e.g. "cyberpunk detective in Neo Tokyo"'
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
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
        <button
          className="primary"
          onClick={handleGenerate}
          disabled={generating || !concept.trim()}
        >
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
