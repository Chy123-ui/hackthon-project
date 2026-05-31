interface Props {
  suggestions: string[];
  loading: boolean;
  onClick: (text: string) => void;
  onSend: (text: string) => void;
}

export default function SuggestionBar({ suggestions, loading: _loading, onClick, onSend }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-bar">
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="suggestion-card"
          onClick={() => onClick(s)}
          onDoubleClick={() => onSend(s)}
        >
          {s}
        </div>
      ))}
    </div>
  );
}
