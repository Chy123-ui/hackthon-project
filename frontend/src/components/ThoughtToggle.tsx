import { useState } from "react";

interface Props {
  thought: string;
}

export default function ThoughtToggle({ thought }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`thought-block${expanded ? " visible" : ""}`}>
      <button
        className="thought-toggle"
        type="button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide thinking" : "Show thinking"}
      </button>
      {expanded && <div className="thought-text">{thought}</div>}
    </div>
  );
}
