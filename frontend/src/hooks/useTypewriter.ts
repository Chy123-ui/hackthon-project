import { useState, useEffect, useRef } from "react";

function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>?/g, "");
}

interface UseTypewriterOptions {
  text: string;
  isActive: boolean;
}

/**
 * Adaptive typewriter: reveals text at dynamic speed.
 * When the source text is far ahead (API pouring fast), reveals faster.
 * When caught up (API paused), reveals at gentle reading speed (~30ms/char).
 */
export function useTypewriter({ text, isActive }: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState("");
  const cleanTextRef = useRef("");
  const positionRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      cleanTextRef.current = stripTags(text);
    }
  }, [text, isActive]);

  useEffect(() => {
    if (!isActive) {
      positionRef.current = 0;
      setDisplayText("");
      return;
    }

    positionRef.current = 0;
    setDisplayText("");

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const source = cleanTextRef.current;
      const gap = source.length - positionRef.current;
      if (gap <= 0) {
        timer = setTimeout(tick, 30);
        return;
      }

      let chars: number;
      let delay: number;
      if (gap > 200)      { chars = 10; delay = 0; }
      else if (gap > 100) { chars = 5;  delay = 1; }
      else if (gap > 50)  { chars = 3;  delay = 5; }
      else if (gap > 20)  { chars = 2;  delay = 10; }
      else                { chars = 1;  delay = 20; }

      positionRef.current += chars;
      if (positionRef.current > source.length) positionRef.current = source.length;
      setDisplayText(source.slice(0, positionRef.current));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 20);
    return () => clearTimeout(timer);
  }, [isActive]);

  const isComplete = cleanTextRef.current.length > 0 && positionRef.current >= cleanTextRef.current.length;

  return { displayText, isComplete };
}
