import { useRef, useState, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}

export default function CustomSelect({ value, onChange, options, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = options.indexOf(hovered ?? value);
      const next = Math.min(idx + 1, options.length - 1);
      setHovered(options[next] ?? options[0]);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.indexOf(hovered ?? value);
      const prev = Math.max(idx - 1, 0);
      setHovered(options[prev] ?? options[0]);
    }
    if (e.key === "Enter" && open && hovered) {
      e.preventDefault();
      onChange(hovered);
      setOpen(false);
    }
  }

  // reset hovered when opening
  function toggle() {
    setOpen((v) => !v);
    setHovered(null);
  }

  return (
    <div
      ref={rootRef}
      className={`custom-select ${className} ${open ? "open" : ""}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <span>{value || "—"}</span>
        <svg
          className={`custom-select-arrow ${open ? "flip" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <path fill="var(--text-secondary)" d="M6 8L1 3h10z" />
        </svg>
      </button>
      {open && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div
              key={opt}
              className={`custom-select-option ${opt === value ? "selected" : ""} ${opt === hovered ? "hovered" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
              onMouseEnter={() => setHovered(opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
