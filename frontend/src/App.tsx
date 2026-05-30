import { useEffect, useState } from "react";
import GameView from "./components/GameView";
import HistoryView from "./components/HistoryView";
import TemplateEditor from "./components/TemplateEditor";
import SettingsPanel from "./components/SettingsPanel";
import { useTheme } from "./context/ThemeContext";
import { getConfig } from "./services/api";
import "./App.css";

type Tab = "game" | "history" | "templates" | "settings";
const CONFIG_PROMPT_KEY = "config_prompt_count";

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [gameKey, setGameKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [templatesKey, setTemplatesKey] = useState(0);
  const [settingsKey, setSettingsKey] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [showConfigAlert, setShowConfigAlert] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const count = parseInt(localStorage.getItem(CONFIG_PROMPT_KEY) || "0", 10);
    if (count >= 3) return;
    getConfig().then((c) => {
      if (!c.api_key || !c.base_url || !c.model) {
        setShowConfigAlert(true);
        localStorage.setItem(CONFIG_PROMPT_KEY, String(count + 1));
      }
    }).catch(() => {});
  }, []);

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
        <div className="nav-brand">re:life</div>
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
            placeholder="搜索..."
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

      {showConfigAlert && (
        <div onClick={() => { setTab("settings"); setShowConfigAlert(false); }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "10px 16px", background: "rgba(124,92,191,0.9)",
            color: "#fff", fontSize: 14, textAlign: "center",
            cursor: "pointer", zIndex: 999,
          }}>
          前往设置完成 API 配置
          <span onClick={(e) => { e.stopPropagation(); setShowConfigAlert(false); }}
            style={{ marginLeft: 16, cursor: "pointer", opacity: 0.7, fontSize: 15 }}>
            ✕
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
