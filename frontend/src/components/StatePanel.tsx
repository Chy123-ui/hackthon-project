import { useState } from "react";

interface Props {
  gameState: Record<string, unknown>;
}

export default function StatePanel({ gameState }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const stateCount = Object.keys(gameState).length;

  if (Object.keys(gameState).length === 0) {
    return null;
  }

  return (
    <div className={`state-panel${collapsed ? " collapsed" : ""}`}>
      <button
        className="state-panel-toggle"
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand game state" : "Collapse game state"}
        title={collapsed ? "Expand game state" : "Collapse game state"}
      >
        {collapsed ? "‹" : "›"}
      </button>
      {collapsed && <span className="state-panel-rail-count">{stateCount}</span>}
      <div className="state-panel-inner">
        <div className="state-panel-header">
          <h4 className="state-panel-title">Game State</h4>
          <span className="state-panel-count">{stateCount}</span>
        </div>
        {Object.entries(gameState).map(([key, value]) => (
          <div key={key} className="state-panel-item">
            <span className="state-panel-key">{key}</span>
            <span className="state-panel-value">
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
