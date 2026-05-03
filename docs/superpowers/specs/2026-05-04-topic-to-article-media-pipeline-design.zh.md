# 主题到文章与配图一体化链路设计

## 0. 一句话结论

PTCE 下一步要补的不是一个更强的 prompt，而是一条可审计的端到端内容生产链路：

```text
主题
-> 真实搜索
-> 时效审计
-> 证据床
-> 文章生成
-> 信息图 brief
-> 生图与质检
-> 微信排版回填
-> 输出包
```

目标是让用户下次只给一个主题，也能自动得到一篇有真实来源、时效边界清楚、配图服务理解而不干扰阅读的公众号文章。

## 1. 背景

这次「前端工程师在 AI 时代的出路」文章暴露了四个问题：

1. 写作没有强制依赖真实搜索，文章容易沿用模型记忆。
2. 数据锚点偏旧。当前日期是 2026-05-04，但正文仍主要引用 2025 年年度数据，没有说明这是最新已发布年度报告，且缺少 2026 年近期材料补充。
3. 配图最初偏通用办公插画，没有直接解释文章观点。
4. 图片插入位置打断论证，后来人工调整为「段落结论之后的信息图总结」才明显改善阅读节奏。

这说明「写文」和「配图」不能分成两个随意串起来的工具调用。文章、证据、视觉 brief、排版位置必须共享同一套结构化中间产物。

## 2. 目标

第一阶段建设一条可验证闭环：

```bash
ptce write topic \
  --topic "前端工程师在 AI 时代的出路" \
  --channel wechat \
  --audience "3-5年经验前端工程师" \
  --output /Users/a1234/Workspace/youmind/outputs/frontend-engineer-ai-era-wechat.md \
  --with-real-research \
  --with-media
```

命令完成后输出：

```text
article.md
research-package.json
freshness-audit.json
evidence-bedrock.json
visual-briefs.json
media-plan.json
layout-report.json
assets/
```

## 3. 非目标

第一阶段不做：

- 自动发布公众号。
- 完全无人审稿。
- 法律级图片版权判断。
- 浏览器截图式排版预览。
- 复杂多轮选题工作台。
- 用生成模型替代真实搜索。

## 4. 核心原则

### 4.1 事实先于文章

公开文章的事实来源必须来自 `ResearchPackage` 和 `EvidenceBedrock`。模型可以组织表达，但不能凭记忆补数据。

### 4.2 时效必须显式

凡是趋势、最新、当前、今年、最近、市场状态相关内容，都必须经过 `FreshnessAudit`。

如果最新官方年度报告仍是上一年，需要写成：

```text
截至 2026-05-04，公开可用的最新年度调查仍是 2025；本文用它做基线，并用 2026 年近期材料补充趋势。
```

不能把 2025 数据写成 2026 当前状态。

### 4.3 图片服务理解，不服务装饰

公众号配图默认不是氛围插画，而是观点信息图。每张图必须绑定一个 section conclusion，并放在该结论之后，作为辅助理解。

### 4.4 宁可少图，不要喧宾夺主

图片不放在问题刚抛出、情绪刚建立、例子刚展开的位置。图片应该出现在读者已经获得一个阶段性判断之后。

## 5. 目标流程

### 5.1 Topic Intake

输入：

```ts
interface TopicWriteInput {
  topic: string;
  channel: 'wechat' | 'blog';
  audience: string;
  purpose?: string;
  outputPath?: string;
  withRealResearch: boolean;
  withMedia: boolean;
  currentDate: string;
}
```

产物：

```ts
interface TopicBrief {
  topic: string;
  audience: string;
  coreQuestion: string;
  angleCandidates: string[];
  assumedClaims: string[];
  requiredResearchAreas: string[];
}
```

### 5.2 Research Plan

根据主题生成 5 到 8 个查询，不只搜一个关键词。

以前端 AI 文章为例：

```text
Stack Overflow AI developers survey 2026
Stack Overflow AI agents survey 2026 developers
DORA 2026 AI assisted software development report
GitHub Copilot coding agent 2026 announcement
Claude Code 2026 developer adoption
AI generated code trust review developers 2026
```

查询应按来源意图分组：

- official_report
- official_blog
- product_announcement
- news_analysis
- counterpoint

### 5.3 Real Search

真实搜索必须走 provider：

- Tavily：网页和新闻搜索。
- Page Extractor：抓正文和页面证据块。

第一阶段仍使用现有 `@ptce/research-media-tools`，但需要补两个能力：

- `maxResults`、`timeRange`、`startDate`、`endDate` 暴露到 CLI。
- query result 保留 `publishedAt`、`sourceDomain`、`evidenceStrength`。

### 5.4 Freshness Audit

新增 `FreshnessAudit`：

```ts
interface FreshnessAudit {
  currentDate: string;
  topicTimeSensitivity: 'low' | 'medium' | 'high';
  sources: FreshnessSourceAssessment[];
  warnings: FreshnessWarning[];
  requiredDisclosures: string[];
  pass: boolean;
}

interface FreshnessSourceAssessment {
  url: string;
  title: string;
  publishedAt?: string;
  sourceYear?: number;
  sourceType: 'annual_report' | 'survey_pulse' | 'product_announcement' | 'news' | 'analysis' | 'unknown';
  freshness: 'current' | 'latest_available' | 'stale' | 'undated';
  usageBoundary: string;
}

interface FreshnessWarning {
  code: 'stale_source' | 'missing_date' | 'latest_annual_not_current_year' | 'insufficient_2026_sources';
  message: string;
  sourceUrl?: string;
}
```

验收规则：

- 高时效主题必须至少有 2 个 2026 来源，除非搜索结果证明没有可用来源。
- 年度报告可以是 2025，但必须标记 `latest_available`。
- 如果所有核心数据都来自 2025，`pass=false`，除非正文加入明确边界并补充 2026 趋势材料。

### 5.5 Evidence Bedrock

`EvidenceBedrock` 从 research package 和 freshness audit 中生成：

```ts
interface EvidenceCard {
  id: string;
  claim: string;
  sourceUrls: string[];
  sourceBoundary: string;
  freshness: 'current' | 'latest_available' | 'stale';
  quoteSafeSummary: string;
}
```

文章生成只能引用 `EvidenceCard.claim` 和 `sourceBoundary`，不能新增未锚定事实。

### 5.6 Article Draft

公众号文章生成时必须写入：

- 核心读者处境。
- 真实来源锚点。
- 作者判断边界。
- 来源边界。
- 图片占位语义，而不是裸 `![图片]`。

示例：

```md
![VISUAL_BRIEF: code_value_shift]
```

### 5.7 Visual Brief

新增 `VisualBrief`，先决定图片表达什么，再生图。

```ts
interface VisualBrief {
  id: string;
  sectionId: string;
  placementAfterAnchor: string;
  role: 'section_summary' | 'concept_map' | 'comparison' | 'workflow' | 'dashboard';
  coreMessage: string;
  chartText: string[];
  style: 'wechat_infographic' | 'dark_dashboard' | 'product_map';
  prompt: string;
  negativePrompt: string;
}
```

默认风格：

```text
中文科技信息图
清晰标题
左右对比 / 流程图 / 模块卡片
少量关键中文
图标、箭头、结论条
不要通用办公插画
```

### 5.8 Image Generation

支持两种 image provider：

- `openai-images`：`/v1/images/generations`
- `gemini-generate-content`：`/v1beta/models/<model>:generateContent`

本次验证后，云雾 Gemini 图片配置为：

```bash
OPENAI_IMAGE_MODEL=gemini-3.1-flash-image-preview
OPENAI_IMAGE_API_STYLE=gemini-generate-content
OPENAI_IMAGE_ENDPOINT=/v1beta/models/gemini-3.1-flash-image-preview:generateContent
```

图片保存到：

```text
assets/<slug>/<visualBriefId>.jpg
```

### 5.9 Media Quality Gate

第一阶段用轻量规则：

- 文件存在且大小大于 50KB。
- 图片数量等于 visual briefs 数量。
- 每张图必须绑定 section conclusion。
- 不允许连续两张图间隔小于 500 字，除非是图集。
- 图片不能出现在小节开头前 2 段。

人工可选检查：

- 主题是否直观。
- 中文是否可读。
- 是否喧宾夺主。
- 是否比原段落更容易理解。

### 5.10 WeChat Layout Pass

图片插入规则：

- 第一张图：放在第一节论证收束之后，不放在开头情绪段中间。
- 中段图：放在小节核心判断之后。
- 方法图：放在方法清单结束之后。
- 图片前后至少有一个自然段，不让图片孤立。

## 6. CLI 设计

### 6.1 新命令

```bash
ptce write topic \
  --topic <topic> \
  --channel wechat \
  --audience <audience> \
  --purpose <purpose> \
  --output <path> \
  --with-real-research \
  --with-media \
  --render json
```

### 6.2 Research Debug 命令增强

```bash
ptce tools research \
  --query <query> \
  --topic news \
  --max-results 8 \
  --time-range year \
  --include-raw-content \
  --render json
```

### 6.3 Media Debug 命令增强

```bash
ptce tools image generate \
  --prompt-file visual-brief.md \
  --output-directory assets \
  --render json
```

## 7. 数据落盘

输出目录建议：

```text
outputs/<slug>/
  article.md
  research-package.json
  freshness-audit.json
  evidence-bedrock.json
  visual-briefs.json
  media-plan.json
  layout-report.json
  assets/
```

如果用户指定单个 markdown 输出路径，则 assets 放在同级目录：

```text
frontend-engineer-ai-era-wechat.md
frontend-engineer-ai-era-assets/
```

## 8. 错误处理

### 8.1 搜索不可用

`--with-real-research` 下搜索失败必须中止，不允许自动 fallback 到 mock。

### 8.2 来源过旧

高时效主题 freshness audit 不通过时：

- `publishable` 模式中止。
- `draft` 模式允许继续，但输出 warning 和 required disclosure。

### 8.3 生图失败

图片生成失败不应阻塞文章生成，但应阻塞「完整输出包」声明。

输出：

```text
article.md
visual-briefs.json
media-plan.json
media-errors.json
```

### 8.4 图片质量不达标

保留旧图和候选图，文章默认使用最后一次通过 gate 的图。候选目录命名：

```text
assets-flash-baseline/
assets-pro-candidate/
assets-infographic-v1/
```

## 9. 验收标准

一篇高时效公众号文章产出成功，必须满足：

- 使用真实搜索 API。
- `research-package.json` 至少包含 5 个来源。
- `freshness-audit.json` 存在，且对 2025/2026 来源边界有明确判断。
- 正文「来源边界」列出事实来源和判断边界。
- 正文没有未锚定的量化趋势判断。
- 至少 3 张信息图，每张图绑定一个 section conclusion。
- 图片不打断开头情绪段和中段例子展开。
- 所有 assets 文件存在。
- CLI 输出明确标注 provider mode、current date、freshness pass/fail。

## 10. 实施拆分建议

第一批任务：

1. 增强 `tools research` 参数，支持真实搜索时效过滤。
2. 新增 `FreshnessAudit` 类型、服务和测试。
3. 新增 `EvidenceBedrock` 从 research package 生成证据卡。
4. 新增 `VisualBrief` 类型和 deterministic planner。
5. 增强 image provider 的 Gemini generateContent 分支，保留当前已验证配置。
6. 新增 `write topic` 命令，先输出 package，不直接追求一键发布。
7. 增加 WeChat layout pass 的图片位置规则。

## 11. 仍需评审的问题

1. `write topic` 是直接落在 `packages/cli/src/write`，还是新建 `packages/content-pipeline` 包？
2. 第一版文章生成是否继续走 mock-server 的 draft/rewrite，还是由 CLI 直接生成 markdown package？
3. Freshness audit 不通过时，是否允许用户用 `--allow-stale-sources` 覆盖？
4. 图片质量 gate 第一版是否只做文件/位置/数量检查，把语义质量留给人工确认？
5. 是否要为中文信息图单独维护 prompt 模板库？

