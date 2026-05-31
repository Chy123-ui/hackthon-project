# re:life

AI 驱动的文字冒险游戏引擎。玩家自由输入动作，AI 作为 GM 推进剧情。

**技术栈**: React + Vite (前端) / Python FastAPI (后端) / OpenAI 兼容 API

**平台支持**: Windows / macOS / Linux

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
# Windows
build.bat

# macOS / Linux
./build.sh
```

输出 `build/re-life.zip`，包含跨平台启动脚本：

| 文件 | 平台 |
|------|------|
| `start.bat` | Windows |
| `start.sh` | macOS / Linux |

用户解压后运行对应脚本，首次启动自动安装依赖并打开浏览器。

### CI/CD

- **CI** (`ci.yml`): 每次 push/PR 运行前端构建 + 后端导入验证 + 安全扫描 (bandit / safety / npm audit)
- **Release** (`release.yml`): push main 时自动打包 zip 发布，tag 格式 `vYYYY.MM.DD-<commit>`，同时更新 `latest`

## 核心特性

- **Agent 协议**: AI 用结构化 XML 输出，后端解析状态并持久化
- **Tape 上下文管理**: 分 live/key/compressed 三级管理对话历史
- **分层 Prompt 系统**: protocol + safety (锁定) + world/player/preferences (可编辑)
- **AI 生成世界**: 描述概念或上传文件，AI 自动生成完整世界模板
- **流式输出**: SSE 实时叙事，自适应速度打字机动画

## 安全

| 层面 | 措施 |
|------|------|
| 秘钥 | 配置 `data/config.json` gitignore；API Key Fernet 加密落盘；解密失败记录告警 |
| 输入 | world 参数路径穿越校验；action/concept/instruction 最大长度限制；player_name 正则过滤 |
| 输出 | LLM 报错返回统一消息，不泄露内部详情；CSP/X-Frame-Options/X-Content-Type-Options 安全头 |
| 访问 | CORS 白名单；LLM 端点速率限制 (60/min)；.key 文件自动设 600 权限 (Linux) |
| 文件 | 会话/配置/YAML 原子写入 (tmp + rename)；zip bomb 解压上限 50MB；会话读写锁 |
| CI | bandit (Python SAST) + safety (依赖扫描) + npm audit + ruff lint |

## 配置

首次启动后在 Settings 页面填写 API Key、Base URL、Model 即可开始游戏。

支持 OpenAI / DeepSeek / Groq 等兼容 API。

## 常见问题

### pip 下载太慢？

使用清华镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 需要代理访问 API？

```bash
# Windows
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
start.bat

# macOS / Linux
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
./start.sh
```

### 速率限制 (429 Too Many Requests)

LLM 端点 (生成/修改/游戏交互) 限流 60 次/分钟，防止脚本意外刷光额度。非 LLM 端点（读取模板、配置等）不受限。
