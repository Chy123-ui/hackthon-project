# re:life

AI 驱动的文字冒险游戏引擎。玩家自由输入动作，AI 作为 GM 推进剧情。

**技术栈**: React + Vite (前端) / Python FastAPI (后端) / OpenAI 兼容 API

## 快速开始

### 开发环境

```bash
# Windows
start-dev.bat

# macOS / Linux
./start-dev.sh
```

脚本会自动创建虚拟环境、安装依赖、启动前后端服务，并打开浏览器。

- 前端: http://localhost:5173
- 后端: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 生产构建

```bash
build.bat    # 输出到 build/re-life/
```

构建好的文件夹可独立分发，用户双击 `start.bat` 即可运行。

## 核心特性

- **Agent 协议**: AI 用结构化 XML 输出，后端解析状态并持久化
- **Tape 上下文管理**: 分 live/key/compressed 三级管理对话历史
- **分层 Prompt 系统**: protocol + safety (锁定) + world/player/preferences (可编辑)
- **AI 生成世界**: 描述概念或上传文件，AI 自动生成完整世界模板
- **流式输出**: SSE 实时叙事，自适应速度打字机动画

## 配置

首次启动后在 Settings 页面填写 API Key、Base URL、Model 即可开始游戏。

支持 OpenAI / DeepSeek / Groq 等兼容 API。
