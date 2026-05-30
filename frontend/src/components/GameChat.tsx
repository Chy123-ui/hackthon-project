import { useEffect, useRef, useState } from "react";
import type { GameSession } from "../services/api";
import { getGameHistory, sendActionStream } from "../services/api";

interface Props {
  gameId: string;
  playerName: string;
  onBack: () => void;
}

function extractTag(raw: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = raw.match(regex);
  return m ? m[1].trim() : "";
}

function stripTags(raw: string): string {
  return raw
    .replace(/<thought>[\s\S]*?<\/thought>/g, "")
    .replace(/<state>[\s\S]*?<\/state>/g, "")
    .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, "")
    .replace(/<\/?narrate>/g, "")
    .trim();
}

export default function GameChat({ gameId, playerName, onBack }: Props) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gameState, setGameState] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  function toggleThought(index: number) {
    setExpandedThoughts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /** Highlight quoted dialogue within narration text */
  function highlightDialogue(text: string): React.ReactNode {
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

  /** Parse assistant message and render with visual layers */
  function renderAssistantContent(raw: string, msgIdx: number): React.ReactNode {
    const thought = extractTag(raw, "thought");
    const narrate = extractTag(raw, "narrate") || raw;
    const showThought = expandedThoughts.has(msgIdx);

    return (
      <div className="assistant-content">
        {thought && (
          <div className={`thought-block${showThought ? " visible" : ""}`}>
            <div
              className="thought-toggle"
              onClick={() => toggleThought(msgIdx)}
            >
              {showThought ? "Hide GM Thought" : "GM Thought"}
            </div>
            {showThought && (
              <div className="thought-text">{thought}</div>
            )}
          </div>
        )}
        <div className="narrate-block">{highlightDialogue(narrate)}</div>
      </div>
    );
  }

  function displayStream(raw: string): string {
    return stripTags(raw);
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
              {msg.role === "user" ? (
                <div className="action-text">{msg.content}</div>
              ) : (
                renderAssistantContent(msg.content, i)
              )}
            </div>
          ))}
          {streamingText && (
            <div className="message assistant">
              <div className="role-label">GM</div>
              <div className="narrate-block streaming">
                {displayStream(streamingText)}
                <span className="typing-cursor" />
              </div>
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
        <textarea
          ref={inputRef}
          placeholder={loading ? "Waiting for GM..." : "What do you do? (Enter to send, Shift+Enter for newline)"}
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
