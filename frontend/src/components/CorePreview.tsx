interface Props {
  protocol: string;
  safety: string;
}

export default function CorePreview({ protocol, safety }: Props) {
  if (!protocol) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: "var(--danger)", fontSize: 14, marginBottom: 8 }}>
        Core Templates (Read Only)
      </h3>
      <div className="template-row">
        <div className="template-column">
          <h3>Agent Protocol</h3>
          <textarea readOnly value={protocol} style={{ minHeight: 250 }} />
        </div>
        <div className="template-column">
          <h3>Safety Rules</h3>
          <textarea readOnly value={safety} style={{ minHeight: 250 }} />
        </div>
      </div>
    </div>
  );
}
