import { useState } from "react";

interface Props {
  gameState: Record<string, unknown>;
}

export default function StatePanel({ gameState }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(Object.keys(gameState))
  );
  const stateCount = Object.keys(gameState).length;

  function toggleItem(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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
        {Object.entries(gameState).map(([key, value]) => {
          const isExpanded = expandedKeys.has(key);
          return (
            <div
              key={key}
              className={`state-panel-item${isExpanded ? "" : " item-collapsed"}`}
            >
              <button
                className="state-panel-key"
                type="button"
                onClick={() => toggleItem(key)}
              >
                <span className={`item-arrow${isExpanded ? " expanded" : ""}`}>▸</span>
                {key}
              </button>
              <span className="state-panel-value">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
