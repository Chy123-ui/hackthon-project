import { useEffect, useRef, useState } from "react";
import type { GameSession } from "../services/api";
import { getGameHistory, sendActionStream } from "../services/api";
import { StreamDisplay } from "../hooks/useGameStream";
import ChatMessage from "./ChatMessage";
import StatePanel from "./StatePanel";
import { useTypewriter } from "../hooks/useTypewriter";

interface Props {
  gameId: string;
  playerName: string;
  onBack: () => void;
}

export default function GameChat({ gameId, playerName, onBack }: Props) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const streamRef = useRef(new StreamDisplay());
  const [displayStream, setDisplayStream] = useState("");
  const [streamComplete, setStreamComplete] = useState(false);
  const finalizingRef = useRef(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gameState, setGameState] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const { displayText: typewriterText, isComplete: typewriterComplete } = useTypewriter({
    text: displayStream,
    isActive: loading,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSession(true);
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingText, typewriterText]);

  useEffect(() => {
    const shouldFinalize = streamComplete && (typewriterComplete || displayStream.length === 0);
    if (!shouldFinalize || finalizingRef.current) return;

    finalizingRef.current = true;
    loadSession().then(() => {
      setStreamingText("");
      setDisplayStream("");
      setStreamComplete(false);
      setLoading(false);
      finalizingRef.current = false;
    });
  }, [displayStream.length, streamComplete, typewriterComplete]);

  async function loadSession(withMeta = false) {
    try {
      const data = await getGameHistory(gameId);
      setSession(data);
      if (withMeta) {
        setGameState(data.game_state || {});
        setSuggestions(data.suggestions || []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSend(action: string) {
    if (!action || loading) return;
    setInput("");
    setLoading(true);
    setStreamingText("");
    setDisplayStream("");
    setStreamComplete(false);
    finalizingRef.current = false;
    streamRef.current = new StreamDisplay();
    setSuggestions([]);
    setError("");

    setSession((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, { role: "user", content: action }] }
        : prev
    );

    await sendActionStream(
      gameId,
      action,
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
        const d = streamRef.current.feed(chunk);
        if (d) setDisplayStream((prev) => prev + d);
      },
      (newSuggestions, newState) => {
        setSuggestions(newSuggestions);
        setGameState(newState);
      },
      () => {
        setStreamComplete(true);
      },
      (err) => {
        setError(err);
        loadSession().then(() => {
          setStreamingText("");
          setDisplayStream("");
          setStreamComplete(false);
          setLoading(false);
        });
      }
    );
  }

  return (
    <div className="chat-view">
      <ChatHeader
        world={session?.world}
        playerName={playerName}
        turn={session?.turn ?? 0}
        onBack={onBack}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className="chat-messages" style={{ flex: 1 }}>
          {session?.messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              playerName={playerName}
            />
          ))}
          {typewriterText && (
            <div className="message assistant">
              <div className="role-label">GM</div>
              <div className="assistant-content">
                <ThoughtPlaceholder />
                <div className="narrate-block streaming">
                  {typewriterText}
                  <span className="typing-cursor" />
                </div>
              </div>
            </div>
          )}
          {loading && !typewriterText && (
            <div className="message assistant">
              <div className="role-label">GM</div>
              Generating...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <StatePanel
          suggestions={suggestions}
          gameState={gameState}
          onSuggestionClick={setInput}
          onSuggestionSend={(text) => handleSend(text)}
        />
      </div>

      {error && <ErrorBanner message={error} />}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={loading}
        inputRef={inputRef}
      />
    </div>
  );
}

/* ---- sub-components (inline, trivial) ---- */

function ThoughtPlaceholder() {
  return (
    <div className="thought-block placeholder">
      <button className="thought-toggle" type="button" disabled>
        Show thinking
      </button>
    </div>
  );
}

function ChatHeader({
  world,
  playerName,
  turn,
  onBack,
}: {
  world?: string;
  playerName: string;
  turn: number;
  onBack: () => void;
}) {
  return (
    <div className="chat-header">
      <div>
        <h2 style={{ display: "inline" }}>
          {world ?? "..."} - {playerName}
        </h2>
        <span className="subtitle">Turn {turn}</span>
      </div>
      <button className="secondary" onClick={onBack}>
        Back to Sessions
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "8px 16px",
        background: "rgba(212,90,90,0.1)",
        color: "var(--danger)",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const text = (e.currentTarget as HTMLTextAreaElement).value.trim();
      if (text) onSend(text);
    }
  }

  function handleClick() {
    const text = value.trim();
    if (text) onSend(text);
  }

  return (
    <div className="chat-input-area">
      <textarea
        ref={inputRef}
        placeholder={
          disabled
            ? "Waiting for GM..."
            : "What do you do? (Enter to send, Shift+Enter for newline)"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button className="primary" onClick={handleClick} disabled={disabled}>
        Send
      </button>
    </div>
  );
}
