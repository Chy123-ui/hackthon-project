import { useState } from "react";
import GameView from "./components/GameView";
import HistoryView from "./components/HistoryView";
import TemplateEditor from "./components/TemplateEditor";
import SettingsPanel from "./components/SettingsPanel";
import { useTheme } from "./context/ThemeContext";
import "./App.css";

type Tab = "game" | "history" | "templates" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [gameKey, setGameKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [templatesKey, setTemplatesKey] = useState(0);
  const [settingsKey, setSettingsKey] = useState(0);
  const { theme, toggleTheme } = useTheme();

  function handleTabClick(id: Tab) {
    if (id === "game" && tab === "game") {
      setGameKey((k) => k + 1);
    } else if (id === "history" && tab === "history") {
      setHistoryKey((k) => k + 1);
    } else if (id === "templates" && tab === "templates") {
      setTemplatesKey((k) => k + 1);
    } else if (id === "settings" && tab === "settings") {
      setSettingsKey((k) => k + 1);
    } else {
      setTab(id);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "game", label: "Game" },
    { id: "history", label: "History" },
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
            onClick={() => handleTabClick(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          className="tab-btn theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{ marginLeft: "auto" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="tab-content">
        {tab === "game" && <GameView key={gameKey} />}
        {tab === "history" && <HistoryView key={historyKey} />}
        {tab === "templates" && <TemplateEditor key={templatesKey} />}
        {tab === "settings" && <SettingsPanel key={settingsKey} />}
      </div>
    </div>
  );
}

export default App;
