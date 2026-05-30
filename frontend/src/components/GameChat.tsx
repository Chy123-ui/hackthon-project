import { useEffect, useRef, useState } from "react";
import type { GameSession } from "../services/api";
import { getGameHistory, sendActionStream } from "../services/api";
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gameState, setGameState] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const { displayText: typewriterText, flush: flushTypewriter } = useTypewriter({
    text: streamingText,
    isActive: loading,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setSuggestions([]);
    setError("");

    const userMsg = { role: "user", content: action };
    setSession((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, userMsg] }
        : prev
    );

    await sendActionStream(
      gameId,
      action,
      (chunk) => setStreamingText((prev) => prev + chunk),
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function displayContent(raw: string): string {
    const match = raw.match(/<narrate>([\s\S]*?)<\/narrate>/);
    return match ? match[1].trim() : raw;
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className="chat-messages" style={{ flex: 1 }}>
          {session?.messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="role-label">
                {msg.role === "user" ? playerName : "GM"}
              </div>
              {displayContent(msg.content)}
            </div>
          ))}
          {typewriterText && (
            <div className="message assistant">
              <div className="role-label">GM</div>
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

        {(suggestions.length > 0 || Object.keys(gameState).length > 0) && (
          <div
            style={{
              width: 240,
              padding: 12,
              background: "var(--bg-secondary)",
              borderLeft: "1px solid var(--border)",
              overflowY: "auto",
              fontSize: 13,
            }}
          >
            {suggestions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: "var(--accent)", marginBottom: 8 }}>
                  Suggested Actions
                </h4>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setInput(s)}
                    style={{
                      padding: "6px 8px",
                      marginBottom: 4,
                      background: "var(--bg-card)",
                      borderRadius: 4,
                      cursor: "pointer",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}

            {Object.keys(gameState).length > 0 && (
              <div>
                <h4
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Game State
                </h4>
                {Object.entries(gameState).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: 4,
                      padding: "4px 8px",
                      background: "var(--bg-card)",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {key}:{" "}
                    </span>
                    <span style={{ color: "var(--text)" }}>
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
          placeholder={loading ? "Waiting for GM..." : "What do you do?"}
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
