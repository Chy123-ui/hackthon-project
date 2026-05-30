import React, { useRef, useCallback } from "react";

export function extractTag(raw: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = raw.match(regex);
  return m ? m[1].trim() : "";
}

export function stripTags(raw: string): string {
  return raw
    .replace(/<thought>[\s\S]*?<\/thought>/g, "")
    .replace(/<state>[\s\S]*?<\/state>/g, "")
    .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, "")
    .replace(/<\/?narrate>/g, "")
    .trim();
}

export function displayNarrate(raw: string): string {
  const open = /<narrate\s*>/i.exec(raw);
  if (!open) {
    const cleaned = raw.replace(/<[^>]*>/g, "").trim();
    return cleaned || raw;
  }
  const start = open.index + open[0].length;
  const close = /<\/narrate\s*>/i.exec(raw.slice(start));
  if (close) {
    return raw.slice(start, start + close.index).trim();
  }
  const partial = raw.slice(start).trim();
  return partial ? partial + " \u2026" : "[interrupted]";
}

/** Stateful stream display: only shows narrate content, hides other blocks during streaming */
export class StreamDisplay {
  private buffer = "";
  private mode: "idle" | "thought" | "narrate" | "state" | "suggestions" = "idle";
  private readonly tags = ["thought", "narrate", "state", "suggestions"] as const;

  feed(chunk: string): string {
    this.buffer += chunk;
    const output: string[] = [];

    while (this.buffer.length > 0) {
      if (this.mode === "idle") {
        const tag = this._nextTag();
        if (!tag) {
          this.buffer = this._keepPossibleOpeningTag(this.buffer);
          break;
        }
        this.mode = tag as typeof this.mode;
        this.buffer = this.buffer.slice(this.buffer.indexOf(`<${tag}>`) + tag.length + 2);
        if (tag === "narrate") this.buffer = this.buffer.replace(/^\n+/, "");
        continue;
      }

      const closeTag = `</${this.mode}>`;
      const idx = this.buffer.indexOf(closeTag);
      if (idx === -1) {
        if (this.mode === "narrate") output.push(this.buffer);
        break;
      }

      if (this.mode === "narrate") output.push(this.buffer.slice(0, idx));
      this.buffer = this.buffer.slice(idx + closeTag.length).replace(/^\n+/, "");
      this.mode = "idle";
    }

    return output.join("");
  }

  private _nextTag(): string | null {
    let found: { tag: string; index: number } | null = null;
    for (const tag of this.tags) {
      const index = this.buffer.indexOf(`<${tag}>`);
      if (index !== -1 && (!found || index < found.index)) {
        found = { tag, index };
      }
    }
    return found?.tag ?? null;
  }

  private _keepPossibleOpeningTag(text: string): string {
    for (let i = Math.max(0, text.length - "<suggestions>".length + 1); i < text.length; i += 1) {
      const suffix = text.slice(i);
      if (this.tags.some((tag) => `<${tag}>`.startsWith(suffix))) {
        return suffix;
      }
    }
    return "";
  }
}

/** Split narration text and wrap quoted dialogue in styled spans */
export function highlightDialogue(text: string): React.ReactNode {
  const parts = text.split(/(\u201c.*?\u201d|\u2018.*?\u2019|\u300c.*?\u300d|".*?")/g);
  return parts.map((part, i) => {
    if (/^[\u201c\u300c\u2018"].*[\u201d\u300d\u2019"]$/.test(part)) {
      return (
        <span key={i} className="dialogue">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function useGameStream() {
  const streamingText = useRef("");
  const callbacksRef = useRef<{
    onChunk?: (t: string) => void;
    onParsed?: (s: string[], st: Record<string, unknown>) => void;
    onDone?: () => void;
    onError?: (e: string) => void;
  }>({});

  const config = useCallback(
    (opts: {
      onChunk: (t: string) => void;
      onParsed: (s: string[], st: Record<string, unknown>) => void;
      onDone: () => void;
      onError: (e: string) => void;
    }) => {
      callbacksRef.current = opts;
      streamingText.current = "";
    },
    []
  );

  const onChunk = useCallback((text: string) => {
    streamingText.current += text;
    callbacksRef.current.onChunk?.(text);
  }, []);

  const onParsed = useCallback(
    (suggestions: string[], state: Record<string, unknown>) => {
      callbacksRef.current.onParsed?.(suggestions, state);
    },
    []
  );

  const onDone = useCallback(() => {
    streamingText.current = "";
    callbacksRef.current.onDone?.();
  }, []);

  const onError = useCallback((err: string) => {
    callbacksRef.current.onError?.(err);
  }, []);

  const getStreamingText = useCallback(() => streamingText.current, []);

  return { config, onChunk, onParsed, onDone, onError, getStreamingText };
}
