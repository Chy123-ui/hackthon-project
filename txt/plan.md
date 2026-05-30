# AI 文游客户端 -- 实施计划

## 项目概述

AI 文字冒险游戏客户端，类似 AI Dungeon / 酒馆 AI 体验。
玩家自由输入动作，AI 作为 GM 推进剧情。

## 技术栈

- 前端: React + Vite, TypeScript
- 后端: Python FastAPI
- LLM API: DeepSeek v4
- 模板格式: YAML

## 核心架构

```
[Browser] <--> [FastAPI Server] <--> [DeepSeek v4 API]
                    |
              Prompt Engine
             /              \
      core/ (锁定)     user/ (可编辑)
```

## 分层 Prompt 模板系统

借鉴 Skills 的 SOURCE + OVERRIDE 模式:

```
templates/
  base/
    system.yaml       # 全局系统级 prompt 结构
  worlds/
    ${world}/
      core.yaml       # 项目维护，锁定品质（世界观、叙事规则、安全护栏）
      user.yaml       # 玩家自定义（角色设定、偏好风格）
```

Core 层（项目锁定）: 世界观一致性、叙事质量、安全边界
User 层（可编辑）: 角色背景、偏好风格、个性化设定

## API 设计

| 端点 | 方法 | 功能 |
|------|------|------|
| /api/game/new | POST | 创建新游戏会话 |
| /api/game/{id}/action | POST | 发送玩家动作，获取 AI 回复 |
| /api/game/{id}/history | GET | 获取会话历史 |
| /api/game/{id} | DELETE | 删除会话 |
| /api/games | GET | 列出所有会话 |
| /api/templates | GET | 列出可用世界模板 |
| /api/templates/{world}/user | GET/PUT | 获取/编辑用户层模板 |
| /api/templates/{world}/preview | GET | 预览合并后的 system prompt |
| /api/config | GET/PUT | 获取/更新配置 |

## 实施步骤

### 阶段 1: 项目脚手架
- [x] 目录结构
- [ ] FastAPI 项目初始化
- [ ] React + Vite 项目初始化

### 阶段 2: Prompt 模板引擎
- [ ] 模板加载器（按世界加载 core + user）
- [ ] 合并渲染逻辑（core + user -> final system prompt）
- [ ] YAML Schema 定义
- [ ] 默认模板（fantasy 世界）

### 阶段 3: API 层
- [ ] 配置管理（API Key、模型参数）
- [ ] DS-v4 API 对接
- [ ] 会话管理（创建/保存/加载）
- [ ] 游戏循环（action -> system prompt + history -> API -> response）

### 阶段 4: 前端
- [ ] 游戏对话界面（酒馆 AI 风格）
- [ ] 模板编辑界面
- [ ] 设置面板

### 阶段 5: 调试打磨
- [ ] 上下文窗口管理（token 限制）
- [ ] 错误处理
- [ ] 用户体验优化
