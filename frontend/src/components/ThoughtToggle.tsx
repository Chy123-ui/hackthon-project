import { useState } from "react";

interface Props {
  thought: string;
}

export default function ThoughtToggle({ thought }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ textAlign: "left", marginTop: -10, marginBottom: 12 }}>
      <button
        className="secondary"
        onClick={() => setExpanded(!expanded)}
        style={{ fontSize: 11, padding: "3px 10px", marginLeft: 16 }}
      >
        {expanded ? "Hide thought" : "Show thought"}
      </button>
      {expanded && (
        <div
          className="message assistant"
          style={{
            opacity: 0.55,
            fontSize: 12,
            fontStyle: "italic",
            marginTop: 4,
            marginLeft: 16,
          }}
        >
          {thought}
        </div>
      )}
    </div>
  );
}
