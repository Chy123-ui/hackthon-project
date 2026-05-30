import ThoughtToggle from "./ThoughtToggle";
import { extractTag, displayNarrate } from "../hooks/useGameStream";

interface Props {
  role: string;
  content: string;
  playerName: string;
}

export default function ChatMessage({ role, content, playerName }: Props) {
  const thought =
    role === "assistant" ? extractTag(content, "thought") : "";

  return (
    <>
      <div className={`message ${role}`}>
        <div className="role-label">
          {role === "user" ? playerName : "GM"}
        </div>
        {displayNarrate(content)}
      </div>
      {thought && <ThoughtToggle thought={thought} />}
    </>
  );
}
