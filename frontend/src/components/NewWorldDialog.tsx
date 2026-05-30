import { useRef, useState } from "react";
import { generateWorld } from "../services/api";

const EXAMPLES = [
  "cyberpunk detective in rain-soaked Neo Tokyo",
  "fantasy world where magic is powered by memories",
  "post-apocalyptic wasteland ruled by sentient machines",
  "steampunk airship city floating above the clouds",
  "underwater civilization threatened by an ancient beast",
  "wild west frontier town with occult secrets",
  "space station on the edge of a black hole",
  "victorian London where ghosts are real and commonplace",
  "martial arts academy hidden in a bamboo forest",
  "medieval kingdom preparing for a dragon awakening",
];

interface Props {
  onCreated: (world: string) => void;
  onError: (msg: string) => void;
}

export default function NewWorldDialog({ onCreated, onError }: Props) {
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);
  const example = useRef(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);

  async function handleGenerate(optConcept?: string) {
    const c = (optConcept ?? concept).trim();
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
          placeholder={`e.g. "${example.current}"`}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !generating) {
              const c = concept.trim() || example.current;
              if (c) { setConcept(c); handleGenerate(c); }
            }
          }}
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
          onClick={() => handleGenerate()}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
