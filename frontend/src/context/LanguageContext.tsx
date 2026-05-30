import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "zh" | "en";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: "zh", setLang: () => {}, t: (k) => k,
});

const dict: Record<Lang, Record<string, string>> = {
  zh: {
    game: "游戏",
    history: "历史",
    templates: "模板",
    settings: "设置",
    "new.game": "开始新游戏",
    "player.name": "角色名",
    "back.sessions": "返回列表",
    "back.templates": "返回模板",
    sending: "发送",
    stop: "停止",
    "waiting.gm": "等待 GM...",
    "what.do": "你想做什么？",
    turn: "回合",
    tokens: "Tokens",
    "gen.loading": "生成中...",
    "gen.success": "生成成功",
    "gen.error": "生成失败",
    "import.loading": "导入中...",
    "import.success": "导入成功",
    "import.error": "导入失败",
    "save.success": "已保存",
    "delete.success": "已删除",
    "delete.prompt": "确定删除？",
    cancel: "取消",
    confirm: "确定",
    "gm.thinking": "GM 思考中",
    "gm.thought": "GM 思考",
    "show.thought": "显示思考",
    "hide.thought": "隐藏思考",
    export: "导出",
    import: "导入",
    delete: "删除",
    modify: "AI 修改",
    "modify.title": "AI 修改",
    "suggested.actions": "推荐行动",
    "game.state": "游戏状态",
    "no.worlds": "还没有世界。创建或导入一个。",
    "all.stories": "所有故事",
    "continue.playing": "继续游戏",
    "or.start.new": "或开始新游戏",
    "template.manager": "模板管理",
    "ai.generate": "AI 生成",
    "import.file": "导入文件",
    "new.world": "新建世界",
    "edit.world": "编辑世界",
    "debug.mode": "调试模式",
    "core.templates": "核心模板",
    "fullscreen": "全屏",
    "ai.modifying": "AI 正在修改...",
  },
  en: {
    game: "Game",
    history: "History",
    templates: "Templates",
    settings: "Settings",
    "new.game": "New Game",
    "player.name": "Player Name",
    "back.sessions": "Back to Sessions",
    "back.templates": "Back to Templates",
    sending: "Send",
    stop: "Stop",
    "waiting.gm": "Waiting for GM...",
    "what.do": "What do you do?",
    turn: "Turn",
    tokens: "Tokens",
    "gen.loading": "Generating...",
    "gen.success": "Generated",
    "gen.error": "Generation failed",
    "import.loading": "Importing...",
    "import.success": "Imported",
    "import.error": "Import failed",
    "save.success": "Saved",
    "delete.success": "Deleted",
    "delete.prompt": "Are you sure?",
    cancel: "Cancel",
    confirm: "Confirm",
    "gm.thinking": "GM Thinking",
    "gm.thought": "GM Thought",
    "show.thought": "Show thought",
    "hide.thought": "Hide thought",
    export: "Export",
    import: "Import",
    delete: "Delete",
    modify: "AI Modify",
    "modify.title": "AI Modify",
    "suggested.actions": "Suggested Actions",
    "game.state": "Game State",
    "no.worlds": "No worlds yet. Create or import one.",
    "all.stories": "All Stories",
    "continue.playing": "Continue Playing",
    "or.start.new": "Or Start a New Game",
    "template.manager": "Template Manager",
    "ai.generate": "AI Generate",
    "import.file": "Import File",
    "new.world": "New World",
    "edit.world": "Edit World",
    "debug.mode": "Debug Mode",
    "core.templates": "Core Templates",
    "fullscreen": "Full",
    "ai.modifying": "AI is modifying...",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem("lang") || "zh") as Lang; }
    catch { return "zh"; }
  });

  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);

  function t(key: string): string {
    return dict[lang][key] || key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
