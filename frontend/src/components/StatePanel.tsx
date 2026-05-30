interface Props {
  gameState: Record<string, unknown>;
}

export default function StatePanel({ gameState }: Props) {
  if (Object.keys(gameState).length === 0) {
    return null;
  }

  return (
    <div className="state-panel">
      <div>
        <h4 className="state-panel-title">Game State</h4>
        {Object.entries(gameState).map(([key, value]) => (
          <div key={key} className="state-panel-item">
            <span className="state-panel-key">{key}: </span>
            <span className="state-panel-value">
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
