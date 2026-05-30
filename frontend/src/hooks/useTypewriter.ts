import { useState, useEffect, useRef } from "react";

/**
 * Strip XML/HTML tags from raw text.
 * Handles partial (unclosed) tags that appear during SSE streaming:
 *   "<narrate>Hello"  →  "Hello"
 *   "world</narrate>" →  "world"
 *   "<thought"        →  ""  (unclosed tag, stripped)
 * The regex matches < followed by non-> chars, optionally ending with >.
 */
function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>?/g, "");
}

interface UseTypewriterOptions {
  /** Raw source text (may contain XML tags from AI output). */
  text: string;
  /** Whether the typewriter is currently animating. */
  isActive: boolean;
  /** Milliseconds delay per character reveal. Default 30. */
  speed?: number;
}

/**
 * Streaming typewriter animation hook.
 *
 * Reveals characters from `text` one at a time at `speed` ms/char while
 * continuously filtering XML tags. Tag filtering works on partial content so
 * no raw tags are ever revealed to the user, even during active streaming.
 *
 * Returns:
 *  - displayText: the current revealed portion, with tags stripped.
 */
export function useTypewriter({ text, isActive, speed = 30 }: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState("");
  const cleanTextRef = useRef("");
  const positionRef = useRef(0);

  // Keep the cleaned (tag-stripped) version current whenever text changes
  useEffect(() => {
    if (isActive) {
      cleanTextRef.current = stripTags(text);
    }
  }, [text, isActive]);

  // Start / stop the reveal timer
  useEffect(() => {
    if (!isActive) {
      positionRef.current = 0;
      setDisplayText("");
      return;
    }

    // Reset for a new streaming session
    positionRef.current = 0;
    setDisplayText("");

    const timer = setInterval(() => {
      const source = cleanTextRef.current;
      if (positionRef.current < source.length) {
        positionRef.current += 1;
        setDisplayText(source.slice(0, positionRef.current));
      }
    }, speed);

    return () => clearInterval(timer);
  }, [isActive, speed]);

  const isComplete = cleanTextRef.current.length > 0 && positionRef.current >= cleanTextRef.current.length;

  return { displayText, isComplete };
}
