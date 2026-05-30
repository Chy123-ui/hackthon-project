# AI 文游 (AI WenYou)

AI 驱动的文字冒险游戏引擎。玩家自由输入动作，AI 作为 GM 推进剧情。

**技术栈**: React + Vite (前端) / Python FastAPI (后端) / OpenAI 兼容 API

## 快速开始

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

## 核心特性

- **Agent 协议**: AI 用结构化 XML 输出（叙事/状态/建议），后端解析状态并持久化
- **Tape 上下文管理**: 分 live/key/compressed 三级管理对话历史，避免超上下文窗口
- **分层 Prompt 系统**: 项目锁定层（protocol + safety）+ 用户可编辑层（世界/角色/偏好）
- **AI 生成世界**: 描述概念或上传文件，AI 自动生成完整世界模板
- **流式输出**: SSE 实时叙事，自适应速度 typewriter 动画
- **禁止行为建议**: 双击建议直接发送

## 项目结构

```
ai-wenyou/
  backend/
    app/              FastAPI 应用
    protocol/         Agent 协议 (锁定)
    default_worlds/   默认世界模板
    data/            运行时数据 (gitignored)
      worlds/        用户世界
      sessions/      游戏会话
  frontend/
    src/
      components/    React 组件
      hooks/         React hooks
      services/      API 客户端
  start-dev.bat      开发启动 (Windows)
  start-dev.sh       开发启动 (macOS/Linux)
```

## 配置

首次启动后在 Settings 页面填写 API Key、Base URL、Model 即可开始游戏。

通用模型兼容协议，支持 OpenAI / DeepSeek / Groq 等。
