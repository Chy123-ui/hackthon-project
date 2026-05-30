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
  const m = raw.match(/<narrate>([\s\S]*?)<\/narrate>/);
  return m ? m[1].trim() : raw;
}

/** Stateful stream display: only shows narrate content, hides other blocks during streaming */
export class StreamDisplay {
  private buffer = "";
  private mode: "idle" | "thought" | "narrate" | "state" | "suggestions" = "idle";
  private _lastLen = 0;

  feed(chunk: string): string {
    this.buffer += chunk;
    const output: string[] = [];

    while (this.buffer.length > 0) {
      if (this.mode === "idle") {
        const tag = this._nextTag();
        if (!tag) break;
        this.mode = tag as typeof this.mode;
        this.buffer = this.buffer.slice(this.buffer.indexOf(`<${tag}>`) + tag.length + 2);
        continue;
      }

      const closeTag = `</${this.mode}>`;
      const idx = this.buffer.indexOf(closeTag);
      if (idx === -1) {
        if (this.mode === "narrate") output.push(this.buffer);
        break;
      }

      if (this.mode === "narrate") output.push(this.buffer.slice(0, idx));
      this.buffer = this.buffer.slice(idx + closeTag.length);
      this.mode = "idle";
    }

    if (this.mode === "idle" && this.buffer.length > 0) {
      const next = this._nextTag();
      if (!next) this.buffer = "";
    }

    const full = output.join("");
    const delta = full.slice(this._lastLen);
    this._lastLen = full.length;
    return delta;
  }

  private _nextTag(): string | null {
    const tags = ["thought", "narrate", "state", "suggestions"];
    for (const t of tags) {
      if (this.buffer.includes(`<${t}>`)) return t;
    }
    return null;
  }
}

/** Split narration text and wrap quoted dialogue in styled spans */
export function highlightDialogue(text: string): React.ReactNode {
  const parts = text.split(/(".*?"|「.*?」|".*?")/g);
  return parts.map((part, i) => {
    if (/^["「].*["」]$/.test(part)) {
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
