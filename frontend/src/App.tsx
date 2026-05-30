import { useState } from "react";
import GameView from "./components/GameView";
import TemplateEditor from "./components/TemplateEditor";
import SettingsPanel from "./components/SettingsPanel";
import "./App.css";

type Tab = "game" | "templates" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("game");

  const tabs: { id: Tab; label: string }[] = [
    { id: "game", label: "Game" },
    { id: "templates", label: "Templates" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="app">
      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === "game" && <GameView />}
        {tab === "templates" && <TemplateEditor />}
        {tab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}

export default App;
