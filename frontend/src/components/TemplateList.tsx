interface Props {
  worlds: string[];
  selectedWorld: string;
  onSelect: (world: string) => void;
  onNewWorld: () => void;
  onExport: (world: string) => void;
  onDelete: (world: string) => void;
  multiSelect?: boolean;
  selected?: Set<string>;
  onSelectToggle?: (world: string) => void;
  onToggleMulti?: () => void;
  multiMode?: boolean;
  selectedCount?: number;
  onBulkDelete?: () => void;
}

export default function TemplateList({
  worlds,
  selectedWorld,
  onSelect,
  onNewWorld,
  onExport,
  onDelete,
  multiSelect,
  selected,
  onSelectToggle,
  onToggleMulti,
  multiMode,
  selectedCount = 0,
  onBulkDelete,
}: Props) {
  return (
    <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
      <h2 style={{ color: "var(--accent)", fontSize: 20, marginBottom: 16 }}>
        模板管理
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="primary" onClick={onNewWorld}>
          + 新建世界
        </button>
        <button className="secondary" onClick={onToggleMulti}>
          {multiMode ? "取消" : "选择"}
        </button>
      </div>

      {multiMode && selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 12,
          background: "rgba(124,92,191,0.1)",
          border: "1px solid var(--accent)", borderRadius: "var(--radius)",
        }}>
          <span style={{ fontSize: 13, color: "var(--accent)" }}>
            {selectedCount} 已选
          </span>
          <div style={{ flex: 1 }} />
          <button className="danger" onClick={onBulkDelete} style={{ fontSize: 13 }}>
            删除已选
          </button>
        </div>
      )}

      {worlds.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          还没有世界。创建或导入一个。
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {worlds.map((w) => (
          <div
            key={w}
            style={{
              padding: 16,
              background: w === selectedWorld ? "rgba(124,92,191,0.1)" : "var(--bg-card)",
              border: w === selectedWorld ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "var(--radius)",
              transition: "all 0.2s",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              {multiSelect && selected && onSelectToggle && (
                <input
                  type="checkbox"
                  checked={selected.has(w)}
                  onChange={() => onSelectToggle(w)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
                />
              )}
              <div onClick={() => onSelect(w)} style={{ flex: 1, cursor: "pointer" }}>
                <h3 style={{ fontSize: 16, color: "var(--text)", marginBottom: 4 }}>
                  {w}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  world / player / preferences
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="secondary"
                onClick={(e) => { e.stopPropagation(); onExport(w); }}
                style={{ fontSize: 12, padding: "4px 12px" }}
              >
                导出
              </button>
              {!multiSelect && (
                <button
                  className="danger"
                  onClick={(e) => { e.stopPropagation(); onDelete(w); }}
                  style={{ fontSize: 12, padding: "4px 12px" }}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
