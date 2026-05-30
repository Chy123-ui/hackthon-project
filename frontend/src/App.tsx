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
  const [historySearch, setHistorySearch] = useState("");
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
    { id: "game", label: "游戏" },
    { id: "history", label: "历史" },
    { id: "templates", label: "模板" },
    { id: "settings", label: "设置" },
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
        <div className="nav-search">
          <input
            type="search"
            placeholder="搜索故事..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
        </div>
        <button
          className="tab-btn theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="tab-content">
        {tab === "game" && <GameView key={gameKey} searchQuery={historySearch} />}
        {tab === "history" && <HistoryView key={historyKey} searchQuery={historySearch} />}
        {tab === "templates" && <TemplateEditor key={templatesKey} searchQuery={historySearch} />}
        {tab === "settings" && <SettingsPanel key={settingsKey} searchQuery={historySearch} />}
      </div>
    </div>
  );
}

export default App;
