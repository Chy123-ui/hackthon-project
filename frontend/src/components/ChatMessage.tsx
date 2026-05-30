import { extractTag, displayNarrate, highlightDialogue } from "../hooks/useGameStream";
import ThoughtToggle from "./ThoughtToggle";

interface Props {
  role: string;
  content: string;
  playerName: string;
}

export default function ChatMessage({ role, content, playerName }: Props) {
  if (role === "user") {
    return (
      <div className="message user">
        <div className="role-label">{playerName}</div>
        <div className="action-text">{content}</div>
      </div>
    );
  }

  const thought = extractTag(content, "thought");
  const narrate = displayNarrate(content);

  return (
    <div className="message assistant">
      <div className="role-label">GM</div>
      <div className="assistant-content">
        {thought && <ThoughtToggle thought={thought} />}
        <div className="narrate-block">{highlightDialogue(narrate)}</div>
      </div>
    </div>
  );
}
