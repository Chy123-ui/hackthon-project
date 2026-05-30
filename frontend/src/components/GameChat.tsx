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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gameState, setGameState] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const { displayText: typewriterText, flush: flushTypewriter } = useTypewriter({
    text: streamingText,
    isActive: loading,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSession();
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingText, typewriterText]);

  async function loadSession() {
    try {
      const data = await getGameHistory(gameId);
      setSession(data);
      setGameState(data.game_state || {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSend() {
    const action = input.trim();
    if (!action || loading) return;
    setInput("");
    setLoading(true);
    setStreamingText("");
    setDisplayStream("");
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
        flushTypewriter();
        loadSession().then(() => {
          setStreamingText("");
          setLoading(false);
        });
      },
      (err) => {
        setError(err);
        loadSession().then(() => {
          setStreamingText("");
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
              <div className="narrate-block streaming">
                {displayStream}
                <span className="typing-cursor" />
              </div>
              {typewriterText}
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
  onSend: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
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
      <button className="primary" onClick={onSend} disabled={disabled}>
        Send
      </button>
    </div>
  );
}
