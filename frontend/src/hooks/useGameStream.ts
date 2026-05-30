import { useRef, useCallback } from "react";

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
