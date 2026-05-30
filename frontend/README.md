# AI WenYou Frontend

React + Vite + TypeScript 前端。

## 启动

```bash
cd frontend
npm install
npm run dev
```

## 构建

```bash
npm run build     # 输出到 dist/
```

## 项目结构

```
src/
  components/     React 组件
    GameChat.tsx      聊天界面
    GameView.tsx      游戏列表
    HistoryView.tsx   历史记录
    TemplateEditor.tsx 模板管理
    SettingsPanel.tsx 设置页
  hooks/          React hooks
    useGameStream.tsx  流式显示
    useTypewriter.ts   打字机动画
  services/       API 客户端
    api.ts
  context/        React Context
    ThemeContext.tsx    暗/亮模式
```

## API 通信

生产模式下使用相对路径 `/api`（同源），开发模式下使用 `http://localhost:8000/api`（CORS）。
