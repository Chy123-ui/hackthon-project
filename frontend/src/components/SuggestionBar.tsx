import { useEffect, useRef, useState } from "react";

interface Props {
  suggestions: string[];
  loading: boolean;
  onClick: (text: string) => void;
  onSend: (text: string) => void;
}

type Phase = "entering" | "idle" | "leaving";

export default function SuggestionBar({
  suggestions,
  loading,
  onClick,
  onSend,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>(
    suggestions
  );
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const prevSuggestionsRef = useRef<string[]>(suggestions);

  useEffect(() => {
    const prev = prevSuggestionsRef.current;
    prevSuggestionsRef.current = suggestions;

    const prevNonEmpty = prev.length > 0;
    const nextNonEmpty = suggestions.length > 0;
    const same =
      prevNonEmpty === nextNonEmpty &&
      prev.join(",") === suggestions.join(",");
    if (same) return;

    if (prevNonEmpty && nextNonEmpty) {
      // Update: old cards leaving → replace → new cards entering
      setPhase("leaving");
      const t = setTimeout(() => {
        setDisplayedSuggestions(suggestions);
        setLastClickedIndex(null);
        setPhase("entering");
      }, 250);
      return () => clearTimeout(t);
    }

    if (prevNonEmpty && !nextNonEmpty) {
      // Non-empty → empty (sent): fade out old cards
      setPhase("leaving");
      const t = setTimeout(() => {
        setDisplayedSuggestions([]);
        setLastClickedIndex(null);
        setPhase("idle");
      }, 250);
      return () => clearTimeout(t);
    }

    if (!prevNonEmpty && nextNonEmpty) {
      // Empty → non-empty (new suggestions): enter
      setDisplayedSuggestions(suggestions);
      setLastClickedIndex(null);
      setPhase("entering");
    }
  }, [suggestions]);

  // After entering completes, go to idle
  useEffect(() => {
    if (phase !== "entering") return;
    if (displayedSuggestions.length === 0) {
      setPhase("idle");
      return;
    }
    const maxDelay = (displayedSuggestions.length - 1) * 100 + 300;
    const t = setTimeout(() => setPhase("idle"), maxDelay);
    return () => clearTimeout(t);
  }, [phase, displayedSuggestions.length]);

  function handleCardClick(text: string, index: number) {
    setLastClickedIndex(index);
    onClick(text);
  }

  function handleCardDoubleClick(text: string, index: number) {
    setLastClickedIndex(index);
    onSend(text);
  }

  if (displayedSuggestions.length === 0 && phase === "idle") return null;

  return (
    <div className="suggestion-bar">
      {displayedSuggestions.map((s, i) => {
        let cls = "suggestion-card";
        if (phase === "entering") {
          cls += " entering";
        } else if (phase === "leaving") {
          cls += " leaving";
        }
        if (lastClickedIndex !== null && i !== lastClickedIndex) {
          cls += " dimmed";
        }
        return (
          <div
            key={i}
            className={cls}
            style={
              phase === "entering"
                ? { animationDelay: `${i * 100}ms` }
                : undefined
            }
            onClick={() => handleCardClick(s, i)}
            onDoubleClick={() => handleCardDoubleClick(s, i)}
          >
            {s}
          </div>
        );
      })}
    </div>
  );
}
