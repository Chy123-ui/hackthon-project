# AI 文游 (AI WenYou)

轻量化 H5 AI 模拟器可视化平台，为 AI 文字冒险游戏提供沉浸式可视化交互层。

## 背景与痛点

当前 AI 模拟器 Prompt 创作与使用进入爆发阶段，大量文字类 AI 模拟器场景应运而生，用户基于原生 AI 工具进行沉浸式剧情、互动模拟、场景推演等游玩体验的需求持续增长。然而，主流原生 AI 工具存在以下痛点：

- **内容混杂无区分**：旁白、正文、人物对话、交互选项、文本输入内容全部堆砌展示，层级混乱，用户难以快速识别核心信息；
- **交互体验简陋**：无专属可视化交互模块，选择操作、文本输入与内容展示相互干扰，操作便捷性极差；
- **无场景氛围适配**：纯文字界面无视觉风格，无法适配不同类型模拟器的场景氛围，沉浸式体验严重不足。

## 产品方案

针对原生 AI 模拟器可视化缺失的痛点，打造轻量化 H5 可视化模拟器，通过以下设计解决用户纯文字游玩的弊端：

- **内容视觉分层**：旁白、正文、对话、选项等不同内容类型拥有独立的视觉样式与展示区域，一目了然；
- **专属交互模块**：提供独立的选择面板、文本输入区等可视化交互组件，操作与内容展示互不干扰；
- **场景化 UI 风格**：根据模拟器主题动态适配界面风格，营造沉浸式游玩氛围。

实现高效、美观、沉浸式的 AI 模拟器游玩体验。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 后端 | FastAPI + Python |
| AI 接入 | HTTPX (LLM API 调用) |
| 样式 | 场景化 CSS 主题系统 |

## 快速启动

**环境要求**：Node.js 18+、Python 3.10+

```bash
# 安装依赖
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# 一键启动（Windows）
start.bat

# 或分别启动
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev
```

启动后访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 项目结构

```
├── frontend/          # React 前端 (Vite + TypeScript)
│   └── src/           # 页面与组件源码
├── backend/           # FastAPI 后端
│   ├── app/           # API 路由与业务逻辑
│   ├── data/          # 数据存储
│   └── templates/     # Prompt 模板
└── start.bat          # 一键启动脚本
```
