# PTCE — Personal Tech Content Engine

一个基于 Claude Code Skills 的 Agentic 写作引擎。用户用自然语言描述写作诉求，Agent 自动选择内容类型、加载写作 skill、通过 PTCE CLI 管理任务状态，产出符合质量门禁的文档。

## 核心理念

```
Agent 负责理解用户、选择 skill、决策下一步、生成内容
PTCE CLI/API 负责创建任务、保存 artifact、标记任务完成
```

传统写作工具假设流程是线性的（素材收集 → 大纲 → 初稿 → 导出），但 PRD、技术文档、公众号文章、通用写作的结构完全不同。PTCE 让 Agent 根据内容类型选择不同的写作 skill 和质量标准，而不是把所有内容塞进同一个流程。

## 内容类型与 Skill 路由

| 内容类型 | Skill | 适用场景 |
|---|---|---|
| `public_article` | `public-article-writing` | 公众号长文、博客、技术随笔、项目复盘 |
| `prd` | `prd-writing` | PRD、功能规格、MVP 范围、验收标准 |
| `technical_doc` | `technical-doc-writing` | 技术设计文档、API 文档、架构说明、排障指南 |
| `general` | `general-writing` | 邮件、备忘录、说明文、改写润色 |

入口 skill `ptce-writing` 负责统一路由和质量门禁调度。

## 质量门禁系统

`public-article-writing` 内置三层质量防线：

**Pre-Writing Gate（写前门禁）**
- HKR 检查：Hook（吸引力）、Knowledge（知识增量）、Resonance（读者共鸣），微信公众号长文 R 为必选项
- Data Anchoring：每条核心论断必须有具名数据源，零源不允许动笔
- Angle Validation：角度必须非显而易见，来自具体场景而非宏观趋势

**Forbidden Tone Patterns（写中禁止句式）**
- 6 类中文命令句式扫描替换表（如 `你应该` → `我发现/我的感受是`）
- 建议前必须承认读者真实约束
- 修辞转折替换为口语化连接

**Post-Writing Self-Audit（写后自检）**
- Source Boundary Scan：每条量化论断可查证，"来源边界"段落必选
- Tone Scan：禁止句式零残留，读者侧共情验证
- Actionability Scan：每条建议不需要头衔/预算/组织变革即可执行
- HKR Re-Check：终稿保持 H、K、R 三项分数

## 项目结构

```
.
├── packages/
│   ├── cli/                  # PTCE CLI (ptce 命令)
│   │   └── src/commands/     # content, write, draft, outline, export ...
│   ├── mock-server/          # Mock API 服务（本地开发用）
│   │   └── src/
│   │       ├── routes/       # content-task, content-metadata, material ...
│   │       ├── services/     # content-task-service
│   │       └── repository/   # content-artifact, content-task, output-package
│   ├── shared/               # 共享类型与合约
│   │   └── src/
│   │       ├── domain.ts     # ContentType, ContentTask, Material ...
│   │       ├── content-types.ts    # 内容类型定义与校验
│   │       ├── content-profiles.ts # WorkflowProfile 注册表
│   │       ├── quality-rubrics.ts  # 质量评分标准
│   │       └── writing-skill-bindings.ts # Skill 绑定
│   └── skills/               # Claude Code Skills（可通过 GitHub 安装）
│       ├── ptce-writing/
│       ├── public-article-writing/
│       ├── prd-writing/
│       ├── technical-doc-writing/
│       └── general-writing/
├── docs/
│   ├── articles/             # 引擎产出的文章
│   │   └── comparisons/      # 多轮质量对比评测
│   ├── reference/            # 参考素材（微信排版样本等）
│   └── superpowers/
│       ├── specs/            # 技术设计文档
│       └── plans/            # 迭代计划
├── .agents/skills/           # Skill 源文件（项目内开发用）
├── fixtures/                 # 测试夹具
└── tests/                    # E2E 测试
```

## 快速开始

### 环境要求

- Node.js >= 18
- Claude Code CLI

### 安装依赖

```bash
npm install
```

### 启动 Mock Server

```bash
npm run dev:server
```

Mock Server 默认运行在 `http://localhost:3100`，提供 Content Task、Artifact、Material 等 API。

### 使用 CLI

```bash
# 创建内容任务
node --import tsx packages/cli/src/index.ts content create \
  --title "前端工程师在AI时代的出路" \
  --type public_article \
  --subtype narrative_article \
  --audience "3-5年经验的前端工程师" \
  --purpose "分析AI对前端岗位的影响并提供可操作的发展方向" \
  --render json

# 存储写作产物
node --import tsx packages/cli/src/index.ts content artifact add \
  --task-id <taskId> \
  --type draft \
  --title "最终稿" \
  --content-file ./output.md \
  --format markdown \
  --created-by agent \
  --render json

# 完成任务
node --import tsx packages/cli/src/index.ts content complete \
  --task-id <taskId> \
  --render json
```

### 配置 Research / Media API Keys

真实搜索和配图 provider 从本地环境变量读取密钥。不要把真实密钥提交到仓库。

本仓库提供 `.env.example` 作为变量名模板；真实密钥放在本地 `.env.local`，该文件已被 `.gitignore` 忽略。

```bash
# 使用真实 provider 运行工具命令
node --env-file=.env.local --import tsx packages/cli/src/index.ts tools search photo \
  --query "frontend engineer ai coding" \
  --render json
```

需要配置的变量：

```bash
TAVILY_API_KEY=
UNSPLASH_ACCESS_KEY=
KLIPY_API_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_IMAGE_MODEL=
OPENAI_IMAGE_API_STYLE=
OPENAI_IMAGE_ENDPOINT=
PTCE_TOOLS_PROVIDER_MODE=real
```

`OPENAI_BASE_URL` 用于 OpenAI-compatible 中转服务，例如填到 `/v1` 这一层；不填时默认使用官方 `https://api.openai.com/v1`。`OPENAI_IMAGE_MODEL` 用于中转服务自己的图片模型名；不填时默认 `gpt-image-2`。

如果图片模型需要走 Gemini `generateContent` 风格接口，配置：

```bash
OPENAI_IMAGE_MODEL=gemini-3-pro-image-preview
OPENAI_IMAGE_API_STYLE=gemini-generate-content
OPENAI_IMAGE_ENDPOINT=/v1beta/models/gemini-3-pro-image-preview:generateContent
```

### 安装 Skills

Skills 已内置在项目中（`.agents/skills/`），同时在 `packages/skills/` 下提供分发包。其他项目可通过 GitHub 安装：

```bash
# 安装全部 skills
claude skills install github:masoncat/personal-tech-writing-engine/packages/skills/ptce-writing
claude skills install github:masoncat/personal-tech-writing-engine/packages/skills/public-article-writing
```

或直接克隆后本地安装：

```bash
claude skills install ./packages/skills/public-article-writing
```

全局安装后，在任何目录的 Claude Code 会话中使用 `/ptce-writing` 或直接描述写作需求即可触发。

### 运行测试

```bash
npm test
```

## 写作质量评测

`docs/articles/comparisons/` 目录下记录了多轮质量迭代的对比：

- `2026-05-03-frontend-ai-ptce-public-article.md` — Skill 初版产出（缺数据、语气居高临下）
- `2026-05-03-frontend-ai-ptce-optimized.md` — 经过 HKR Gate + Voice Pass + Layout Pass 完整流程后的优化版

核心改进维度：数据锚定（Stack Overflow 2025 / GitHub Copilot / State of JS 2025 等真实来源）、读者侧共情（先承认约束再给建议）、可操作路径（每个建议附低门槛第一步）。

## License

MIT © 2026 masoncat
