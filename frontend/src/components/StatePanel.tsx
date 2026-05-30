import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  gameState: Record<string, unknown>;
}

export default function StatePanel({ gameState }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [longKeys, setLongKeys] = useState<Set<string>>(new Set());
  const valueRefs = useRef(new Map<string, HTMLSpanElement>());
  const stateCount = Object.keys(gameState).length;

  useLayoutEffect(() => {
    const nextLongKeys = new Set<string>();

    for (const key of Object.keys(gameState)) {
      if (isPinnedKey(key)) continue;

      const el = valueRefs.current.get(key);
      if (!el) continue;

      const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
      const threshold = lineHeight * 5;
      if (el.scrollHeight > threshold) {
        nextLongKeys.add(key);
      }
    }

    setLongKeys(nextLongKeys);
    setCollapsedKeys(new Set(nextLongKeys));
  }, [gameState]);

  function toggleItem(key: string) {
    if (!longKeys.has(key) || isPinnedKey(key)) return;

    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (stateCount === 0) {
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
        {collapsed ? "<" : ">"}
      </button>
      {collapsed && <span className="state-panel-rail-count">{stateCount}</span>}
      <div className="state-panel-inner">
        <div className="state-panel-header">
          <h4 className="state-panel-title">Game State</h4>
          <span className="state-panel-count">{stateCount}</span>
        </div>
        {Object.entries(gameState).map(([key, value]) => {
          const text = Array.isArray(value) ? value.join(", ") : String(value);
          const canCollapse = longKeys.has(key) && !isPinnedKey(key);
          const isCollapsed = collapsedKeys.has(key);

          return (
            <div
              key={key}
              className={`state-panel-item${isCollapsed ? " item-collapsed" : ""}`}
            >
              <button
                className="state-panel-key"
                type="button"
                onClick={() => toggleItem(key)}
                disabled={!canCollapse}
              >
                {canCollapse && (
                  <span className={`item-arrow${isCollapsed ? "" : " expanded"}`}>
                    &gt;
                  </span>
                )}
                {key}
              </button>
              <span
                ref={(el) => {
                  if (el) valueRefs.current.set(key, el);
                  else valueRefs.current.delete(key);
                }}
                className="state-panel-value"
              >
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isPinnedKey(key: string) {
  const normalized = key.trim().toLowerCase();
  return normalized === "location" || normalized === "hp";
}
