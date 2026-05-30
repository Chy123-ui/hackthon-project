import { useEffect, useRef, useState } from "react";
import type { GameSession } from "../services/api";
import { getGameHistory, sendActionStream } from "../services/api";

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
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingText]);

  async function loadSession() {
    try {
      const data = await getGameHistory(gameId);
      setSession(data);
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
    setError("");

    const userMsg = { role: "user", content: action };
    setSession((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, userMsg],
          }
        : prev
    );

    await sendActionStream(
      gameId,
      action,
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      () => {
        setStreamingText("");
        loadSession();
        setLoading(false);
      },
      (err) => {
        setError(err);
        loadSession();
        setLoading(false);
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div>
          <h2 style={{ display: "inline" }}>
            {session?.world ?? "..."} - {playerName}
          </h2>
          <span className="subtitle">Turn {session?.turn ?? 0}</span>
        </div>
        <button className="secondary" onClick={onBack}>
          Back to Sessions
        </button>
      </div>

      <div className="chat-messages">
        {session?.messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="role-label">
              {msg.role === "user" ? playerName : "GM"}
            </div>
            {msg.content}
          </div>
        ))}
        {streamingText && (
          <div className="message assistant">
            <div className="role-label">GM</div>
            {streamingText}
          </div>
        )}
        {loading && !streamingText && (
          <div className="message assistant">
            <div className="role-label">GM</div>
            Generating...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(212,90,90,0.1)",
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          placeholder={
            loading ? "Waiting for GM..." : "What do you do?"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="primary" onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
