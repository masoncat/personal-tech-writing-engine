# 内容类型与写作 Skill 分层设计，中文 Review 版

## 0. 一句话结论

可以把写作能力拆成 4 个 skill：

```text
general-writing
prd-writing
public-article-writing
technical-doc-writing
```

但它们不应该是 4 个完全平级、互相重复的 skill。

更合理的结构是：

```text
general-writing，通用写作底座
├─ public-article-writing，公开文章
├─ prd-writing，产品需求文档
└─ technical-doc-writing，技术文档
```

产品信息架构上，对应的是：

```text
ContentTask
├─ contentType
├─ contentSubtype
├─ workflowProfile
├─ qualityRubric
├─ sourceRequirements
├─ reviewChecklist
└─ outputPackage
```

也就是说，用户不是进入一个通用写作流水线，而是先选择或被系统识别为某一种内容类型，再进入对应的工作流和评判标准。

## 1. 为什么要拆成 4 个 skill

公开文章、PRD、技术文档、通用写作的目标不同。

如果用同一套标准评估它们，产品会变形：

- 用公众号标准写 PRD，会变得好读但不好执行
- 用技术文档标准写公众号，会变得准确但无聊
- 用 PRD 标准写技术文档，会变得决策导向过强，但缺少使用路径
- 用通用润色标准处理所有内容，会退化成普通 AI 写作工具

所以需要拆分。

每个 skill 应该回答四个问题：

1. 这类文档的最终用途是什么？
2. 它的生产流程是什么？
3. 它的质量评判标准是什么？
4. 它不能牺牲什么？

## 2. 外部调研后的修正

这次补充查了 GitHub 和公开最佳实践资料后，设计需要加一层更明确的判断：

**四个 skill 不是四种「写作风格」，而是四种「读者任务模型」。**

有几个高价值参考：

- [Diátaxis](https://diataxis.fr/) 把技术文档按用户需求拆成 tutorial、how-to、reference、explanation。这个思路说明技术文档不能只按格式分类，要按读者当下任务分类。
- [The Good Docs Project templates](https://github.com/thegooddocsproject/templates) 把文档模板组织成 concept、task、reference 等类型，并提供 API overview、quickstart、reference、how-to 等模板。这个可以直接影响 `technical-doc-writing` 的内部子类型。
- [GitHub Docs best practices](https://docs.github.com/en/contributing/writing-for-github-docs/best-practices-for-github-docs) 强调先定义 audience、core purpose 和 content type，再组织内容。这支持产品层必须先有 `contentType` 和 `WorkflowProfile`。
- [Atlassian PRD guide](https://www.atlassian.com/agile/product-management/requirements) 强调 PRD 是团队对齐工具，不是提前写死所有细节；高价值部分包括 goals、assumptions、user stories、design、out-of-scope、questions，以及协作维护。
- [Google Search people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) 强调内容应对真实读者有帮助，有原创分析、经验、可信来源和清晰的创作目的。这能补强公开文章的「真」和通用写作的「读者价值」。
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com/writing-principles/) 的核心原则是 clear、useful、friendly、appropriate，并强调尊重读者、告诉读者需要知道的信息。这能作为 `general-writing` 的通用底线。
- [GOV.UK content design guidance](https://www.gov.uk/guidance/content-design/writing-for-gov-uk) 强调先满足 user need，不要发布所有能发布的信息。这对 PRD、技术文档、公开文章都适用。
- [Google documentation best practices](https://google.github.io/styleguide/docguide/best_practices.html) 强调 minimum viable documentation、文档随代码更新、删除死文档。这应该进入技术文档的可维护性检查。

GitHub 搜索补充结论：

- PRD 模板仓库数量不少，但多数只是静态模板，参考价值主要是字段覆盖，不足以指导产品信息架构。
- 技术文档方向高价值项目更集中在长期维护的模板和框架，例如 The Good Docs Project、GitHub Docs 的内容模型，以及围绕 Diátaxis 的实践。
- 内容风格指南方向，Mailchimp 这类公开 style guide 的价值不在模板，而在「原则 + 场景 + 语气边界」的组织方式。

所以本产品不应该简单内置一堆模板，而应该内置：

```text
内容类型识别
-> 子类型识别
-> 工作流 profile
-> 质量 rubric
-> 输出 package
```

因此，这份设计做三处修正：

1. `technical-doc-writing` 内部要再分 `tutorial / how-to / reference / explanation / troubleshooting / quickstart`。
2. `prd-writing` 要强调协作、living document、just enough context，而不是一次性完美规格书。
3. `general-writing` 不是「润色器」，而是所有写作任务共享的读者价值和信息清晰度底线。

## 3. 总体原则

### 3.1 一个任务只应该有一个主 skill

未来 agent 执行时，不应该同时加载 4 个 skill。

推荐规则：

```text
每个写作任务只选择一个 primary writing skill。
```

例如：

- 写公众号文章，主 skill 是 `public-article-writing`
- 写 PRD，主 skill 是 `prd-writing`
- 写 API 文档，主 skill 是 `technical-doc-writing`
- 写一段不明确文体的说明、邮件、备忘录，主 skill 是 `general-writing`

专属 skill 可以引用通用原则，但不要复制通用 skill 的大段内容。

### 3.2 `general-writing` 是底座，不是万能入口

`general-writing` 容易过度触发，所以它的描述要克制。

它适合：

- 文体不明确
- 用户明确说「帮我润色」「帮我改清楚」
- 多种文体混合，暂时无法归类
- 其他专属 skill 都不适用

它不应该抢走 PRD、公开文章、技术文档的任务。

### 3.3 专属 skill 只放文体差异

每个专属 skill 不要重复写：

- 如何收集材料
- 如何区分事实和观点
- 如何减少空话
- 如何做基本结构化

这些属于通用写作底座。

专属 skill 只负责：

- 文体目标
- 文体流程
- 文体质量标准
- 文体禁区
- 文体输出格式

### 3.4 产品里叫 content type，agent 里叫 skill

产品信息架构不应该暴露「skill」这个内部概念。

产品里应该叫：

```text
内容类型 / Content Type
```

Agent 执行层再映射到：

```text
writing skill
```

对应关系：

```text
public_article -> public-article-writing
prd -> prd-writing
technical_doc -> technical-doc-writing
general -> general-writing
```

## 4. 四个 skill 的职责

## 4.1 `general-writing`

### 定位

通用写作底座。

它处理所有文体都需要的底层问题：

- 写给谁
- 为什么写
- 要让读者做什么
- 哪些是事实
- 哪些是判断
- 哪些只是推测
- 哪些信息多余
- 结构是否顺
- 表达是否清楚
- 是否有 AI 味、套话、空话

### 适用场景

- 普通说明文
- 备忘录
- 邮件
- 简短方案说明
- 混合文体草稿
- 用户没有明确文档类型的润色和改写

### 不适用场景

- 明确是 PRD，用 `prd-writing`
- 明确是公开文章，用 `public-article-writing`
- 明确是技术文档，用 `technical-doc-writing`

### 推荐优先级

```text
清晰 > 准确 > 有用 > 简洁 > 风格
```

### 通用流程

```text
写作目的
-> 目标读者
-> 读者行动
-> 材料整理
-> 事实 / 判断 / 推测分层
-> 结构重组
-> 草稿
-> 清晰度检查
-> 冗余和套话清理
-> 最终版本
```

### 质量标准

- 读者知道这段内容为什么存在
- 读者知道重点是什么
- 事实、判断、推测没有混在一起
- 结构不绕
- 没有明显套话和空话
- 不为了显得高级而增加复杂度

### 外部借鉴

`general-writing` 可以吸收 Mailchimp 和 GOV.UK 的共同原则：

- 内容首先服务读者任务，而不是作者想说什么
- 语言要清楚、可用、尊重读者
- 语气要适合场景，不要为了有趣牺牲准确
- 不发布所有能发布的信息，只发布读者完成任务需要的信息

这意味着通用写作的默认问题不是「怎么写得更漂亮」，而是：

```text
这段内容对读者有什么用？
读者读完后能理解什么，能做什么？
有没有删掉作者自嗨但读者不需要的内容？
```

## 4.2 `public-article-writing`

### 定位

公开文章写作，覆盖公众号、博客、公开技术文章、项目复盘文章。

它的目标不是把信息写完整，而是把内容做成一篇有人愿意读完、愿意收藏、愿意转发、适合发布的作品。

### 适用场景

- 公众号长文
- 技术博客
- 公开项目复盘
- 技术观点文章
- 源码 / 技术原理解析文章
- 工具体验文章

### 推荐优先级

```text
美 > 真 > 像
```

这里的「美」是广义成品吸引力，不只是排版。

### 核心流程

```text
写作意图
-> 成品力简报
-> 证据底座
-> 叙事主线
-> 初稿
-> 真实性检查
-> 风格贴合
-> 发布成品包
-> 最终质量报告
```

### 核心对象

- `AppealBrief`
- `EvidenceBedrock`
- `NarrativeOutline`
- `TruthCheckReport`
- `PublicationPackage`
- `FinalQualityReport`

### 质量标准

- 选题有钩子
- 开头能抓人
- 文章有主线
- 知识点自然进入
- 关键判断有证据
- 没有伪造经历
- 读完有收束感
- 博客版和公众号版有渠道差异
- 风格贴合但不压过真实和成品感

### 外部借鉴

公开文章除了借鉴 `khazix-writer`，还应该吸收 Google Search 的 people-first content 原则：

- 有明确受众，不是为了蹭流量而写
- 有原创信息、经验、研究或分析
- 不只是改写别人已有内容
- 标题描述有帮助，但不夸张惊悚
- 读者读完后觉得获得了足够信息或满意体验
- 可信度来自作者经验、证据、来源和透明边界

因此 `public-article-writing` 的 `AppealBrief` 不能只问「有没有传播钩子」，还要问：

```text
这篇文章的独特价值是什么？
它有什么别人没有的经验、判断、材料或组织方式？
读者为什么不应该只去看原始资料？
```

### 禁区

- 为了好看编造事实
- 为了像用户而牺牲可读性
- 把公开文章写成 PRD 或技术说明书
- 只做润色，不做选题、结构和成品判断

## 4.3 `prd-writing`

### 定位

产品需求文档写作。

PRD 的目标不是好看，也不是像作者本人，而是让团队能围绕同一个问题、范围、方案和验收标准达成一致。

### 适用场景

- 产品需求文档
- MVP 范围定义
- 功能设计说明
- 用户故事和验收标准
- 产品方案对齐文档
- 需求评审材料

### 推荐优先级

```text
用 > 真 > 清晰 > 完整 > 美 > 像
```

这里的「用」指：

- 可决策
- 可执行
- 可验收
- 可评审

### 核心流程

```text
需求意图
-> 问题定义
-> 用户 / 场景 / 任务分析
-> 证据与约束整理
-> 目标与非目标
-> 方案选项与取舍
-> 范围裁剪
-> 验收标准
-> PRD 草稿
-> 一致性检查
-> Review 包
```

### 核心对象

- `ProblemBrief`
- `UserScenarioModel`
- `RequirementModel`
- `ScopeBoundary`
- `DecisionRecord`
- `AcceptanceCriteria`
- `PRDPackage`

### 质量标准

- 问题真实存在
- 目标用户和场景清楚
- 要解决的问题不是伪需求
- 目标和非目标明确
- 约束条件显性
- 方案取舍说清楚
- P0 / P1 / 暂缓范围清楚
- 验收标准可测试
- 风险、依赖、开放问题被暴露
- 读完后团队知道下一步怎么做

### 外部借鉴

Atlassian 的 PRD 指南有三个点值得吸收：

- PRD 应该建立团队共享理解，而不是提前写死所有实现细节
- PRD 要保留 just enough context，用链接和引用承载细节，正文保持可读和可评审
- PRD 是 living document，需要协作维护，而不是一次性签完就不再更新

所以 `prd-writing` 应该新增三个检查：

```text
协作检查，是否暴露参与者、决策者、review 对象和待确认问题？
上下文检查，正文是否只保留足够决策的信息，细节是否用链接承载？
时效检查，需求变化后是否有更新路径，而不是把 PRD 当静态交付物？
```

PRD 的核心不是「写得详尽」，而是「足够让团队做正确下一步」。

### 禁区

- 写成宣传稿
- 为了显得完整而扩大范围
- 只有功能列表，没有问题定义
- 只有方案，没有取舍
- 只有愿景，没有验收标准
- 把不确定内容写成确定需求

## 4.4 `technical-doc-writing`

### 定位

技术文档写作。

技术文档的目标是让读者正确理解、正确使用、正确维护一个系统、接口、模块或流程。

它的第一优先级是准确。

### 适用场景

- API 文档
- 架构说明
- 模块设计文档
- 开发指南
- 运维手册
- 故障排查文档
- README
- 集成文档

### 推荐优先级

```text
准 > 可执行 > 完整 > 清晰 > 美 > 像
```

这里的「准」指和真实系统一致。

### 核心流程

```text
文档目的
-> 读者任务
-> 真实来源盘点
-> 信息结构
-> 技术草稿
-> 正确性检查
-> 示例 / 命令 / 接口校验
-> 边界和失败模式补全
-> 可维护性检查
-> 发布版本
```

### 核心对象

- `DocIntent`
- `ReaderTaskMap`
- `SourceOfTruthMap`
- `InformationArchitecture`
- `TechnicalDraft`
- `CorrectnessCheck`
- `ExampleValidation`
- `DocPackage`

### 质量标准

- 和代码、API、配置、架构一致
- 读者能按文档完成任务
- 示例命令能跑
- 接口参数、返回值、错误码准确
- 边界条件写清楚
- 失败模式和排查路径写清楚
- 新人能靠它减少询问
- 维护者知道后续怎么更新

### 内部子类型

技术文档不能只叫 `technical_doc`。参考 Diátaxis、The Good Docs Project 和 GitHub Docs，内部至少要识别这些子类型：

```text
tutorial，带读者学习一个完整路径
how_to，帮助读者完成一个具体任务
reference，提供可查找的规格、参数、接口、错误码
explanation，解释概念、架构、原因和背景
troubleshooting，帮助读者定位和解决问题
quickstart，让读者用最短路径看到可运行结果
```

这些子类型的质量标准不同：

- `tutorial` 要关注学习路径和渐进体验
- `how_to` 要关注步骤是否可执行
- `reference` 要关注完整性、准确性和可扫描
- `explanation` 要关注概念关系和为什么
- `troubleshooting` 要关注症状、原因、验证和修复路径
- `quickstart` 要关注最短成功路径和环境前提

所以 `technical-doc-writing` 的 `InformationArchitecture` 不能只输出章节列表，必须先判断文档子类型。

### 外部借鉴

技术文档还应吸收 Google documentation best practices 的维护原则：

- 最小可用文档优先，少而新鲜，比多而过期更好
- 文档应该随代码/API 变化一起更新
- 需要能删除或标记死文档
- 示例应该从最简单用法开始

因此技术文档的质量报告里应增加：

```text
freshness，是否可能已经过期？
sourceSync，是否能追溯到代码/API/配置来源？
exampleOrder，是否先给最简单可运行示例？
deadDocRisk，是否存在无维护价值的过期内容？
```

### 禁区

- 不看代码或真实接口就写
- 示例无法运行
- 只写 happy path
- 把实现细节和用户任务混在一起
- 用模糊词代替准确描述
- 为了好读删掉必要边界

## 5. 产品信息架构

## 5.1 顶层对象

建议把产品的顶层对象从 `WritingTask` 升级为更通用的：

```text
ContentTask
```

字段：

- `id`
- `title`
- `contentType`
- `contentSubtype`
- `audience`
- `purpose`
- `sourceMaterials`
- `workflowProfileId`
- `qualityRubricId`
- `currentStage`
- `createdAt`
- `updatedAt`

### contentType

枚举：

```text
general
public_article
prd
technical_doc
```

### contentSubtype

`contentSubtype` 是内容类型下的二级分类。

第一版建议：

```text
public_article:
  - narrative_article
  - source_analysis
  - tool_experience
  - project_retrospective

prd:
  - feature_prd
  - mvp_scope
  - product_strategy
  - requirement_review

technical_doc:
  - tutorial
  - how_to
  - reference
  - explanation
  - troubleshooting
  - quickstart

general:
  - memo
  - email
  - explanation
  - mixed_draft
```

`contentType` 决定主 skill，`contentSubtype` 决定该 skill 内部使用哪套结构和检查表。

后续可以扩展：

```text
design_doc
retrospective
research_summary
release_note
```

但第一版不要急着扩。

## 5.2 WorkflowProfile

`WorkflowProfile` 定义某类内容怎么生产。

字段：

- `id`
- `contentType`
- `contentSubtype`
- `stageDefinitions`
- `requiredInputs`
- `optionalInputs`
- `confirmationGates`
- `outputArtifacts`

示例：

```text
public_article.workflowProfile
-> appeal brief
-> evidence bedrock
-> narrative outline
-> draft
-> truth check
-> style pass
-> publication package
```

```text
prd.workflowProfile
-> problem brief
-> scenario model
-> requirement model
-> scope boundary
-> decision record
-> acceptance criteria
-> prd package
```

```text
technical_doc.workflowProfile
-> doc intent
-> reader task map
-> source of truth map
-> information architecture
-> technical draft
-> correctness check
-> example validation
-> doc package
```

## 5.3 QualityRubric

`QualityRubric` 定义某类内容怎么评判。

字段：

- `id`
- `contentType`
- `contentSubtype`
- `priorityOrder`
- `criteria`
- `hardFailures`
- `reviewQuestions`
- `releaseReadinessRules`

示例：

```text
public_article.priorityOrder = 美 > 真 > 像
prd.priorityOrder = 用 > 真 > 清晰 > 完整 > 美 > 像
technical_doc.priorityOrder = 准 > 可执行 > 完整 > 清晰 > 美 > 像
general.priorityOrder = 清晰 > 准确 > 有用 > 简洁 > 风格
```

## 5.4 OutputPackage

`OutputPackage` 定义最终交付物。

公开文章：

- 博客版
- 公众号版
- 标题候选
- 导语候选
- 封面图 brief
- 发布检查报告

PRD：

- PRD 正文
- Review 摘要
- 需求范围表
- 验收标准
- 风险和开放问题
- 决策记录

技术文档：

- 文档正文
- 示例代码或命令
- API / 配置引用
- 错误码和故障排查
- 正确性检查报告
- 维护说明

通用写作：

- 最终正文
- 修改摘要
- 清晰度检查结果

## 6. Agent Skill 架构

## 6.1 目录建议

如果后续真的落成 skills，建议目录类似：

```text
~/.agents/skills/
  general-writing/
    SKILL.md
    references/
      clarity-checklist.md
      fact-judgment-inference.md

  public-article-writing/
    SKILL.md
    references/
      hkr-rubric.md
      article-prototypes.md
      khazix-methodology.md

  prd-writing/
    SKILL.md
    references/
      prd-rubric.md
      acceptance-criteria.md
      scope-boundary.md

  technical-doc-writing/
    SKILL.md
    references/
      doc-types.md
      correctness-check.md
      example-validation.md
```

## 6.2 Description 触发边界

skill 的 `description` 只应该描述什么时候触发，不要在 description 里总结完整流程。

建议触发描述：

```yaml
name: general-writing
description: Use when improving or producing writing that has no clear specialized document type, including general explanations, memos, emails, mixed-format drafts, and clarity-focused rewrites.
```

```yaml
name: public-article-writing
description: Use when writing or revising public-facing articles, blog posts, WeChat long-form posts, technical essays, project retrospectives, or publishable narrative content.
```

```yaml
name: prd-writing
description: Use when writing or revising product requirement documents, MVP scopes, feature specs, user stories, acceptance criteria, or product review materials.
```

```yaml
name: technical-doc-writing
description: Use when writing or revising technical documentation, API docs, architecture docs, developer guides, READMEs, runbooks, integration guides, or troubleshooting docs.
```

## 6.3 Skill 之间的关系

不要在每个专属 skill 里复制 `general-writing` 全文。

推荐写法：

```text
专属 skill 内只写：
- 本文体目标
- 本文体流程
- 本文体质量标准
- 本文体禁区
- 需要时参考 general-writing 的事实/判断/推测分层原则
```

但执行时仍然只加载一个主 skill。

如果未来平台支持 skill 间引用，可以让专属 skill 显式引用 `general-writing` 的小型 reference，而不是加载完整通用 skill。

## 7. 和现有两个项目的关系

## 7.1 `personal-tech-research-engine`

继续负责所有内容类型共享的研究和材料层。

它不关心最终是文章、PRD 还是技术文档。

它输出：

- source card
- research summary
- evidence package
- conflict list
- open questions
- source quality score
- topic index

不同内容类型消费这些材料的方式不同：

- 公开文章看重选题角度、具体案例、可读故事和可信边界
- PRD 看重用户问题、证据、约束、风险和决策依据
- 技术文档看重真实来源、代码/API 一致性、边界和失败模式

## 7.2 `personal-tech-writing-engine`

这个项目应该从单一 writing workflow 演进为：

```text
personal-tech-content-engine
```

也就是：

```text
内容任务编排器
```

它负责：

- 识别内容类型
- 选择 workflow profile
- 选择 quality rubric
- 管理材料
- 生成中间对象
- 生成最终 output package
- 写回 Obsidian

短期内仓库名可以不改，产品概念先升级。

## 8. 产品入口设计

用户新建任务时，不应该先进入某个固定写作流程。

建议入口是：

```text
新建内容任务
├─ 写一篇公开文章
├─ 写一份 PRD
├─ 写一份技术文档
└─ 先不确定，帮我判断
```

如果用户选择「先不确定」，系统应该根据输入判断：

- 有「用户、需求、验收、MVP、范围」等信号，建议 PRD
- 有「API、架构、部署、README、错误码」等信号，建议技术文档
- 有「公众号、博客、发布、复盘、观点」等信号，建议公开文章
- 都不明显，进入通用写作

## 9. 第一版落地顺序

不建议一口气实现 4 个完整 workflow。

推荐顺序：

1. 先把 `ContentTask.contentType` 和 `QualityRubric` 抽出来
2. 保留当前公开文章链路，改名为 `public_article` profile
3. 增加 `prd` 的轻量 workflow 和 rubric
4. 增加 `technical_doc` 的轻量 workflow 和 rubric
5. 最后补 `general` 的通用改写能力

原因：

- 公开文章链路已经有前序设计
- PRD 的对象边界相对清楚
- 技术文档需要更强的真实代码/API 校验，工程成本更高
- 通用写作最容易泛化失控，反而应该最后收口

## 10. MVP 裁剪建议

第一版产品层不要做太多文体。

建议只支持：

```text
public_article
prd
technical_doc
general
```

每种只做最小闭环。

### public_article MVP

```text
appeal brief
-> evidence bedrock
-> narrative outline
-> draft
-> truth check
-> publication package
```

### prd MVP

```text
problem brief
-> scenario model
-> requirement model
-> scope boundary
-> acceptance criteria
-> prd package
```

### technical_doc MVP

```text
doc intent
-> reader task map
-> source of truth map
-> information architecture
-> technical draft
-> correctness checklist
-> doc package
```

### general MVP

```text
purpose
-> audience
-> material cleanup
-> structure rewrite
-> clarity check
-> final text
```

## 11. 验收标准

这个分层设计成立的标准：

- 用户新建任务时能明确选择内容类型，或由系统推荐内容类型
- 不同内容类型进入不同 workflow，而不是共用一条文章链路
- 不同内容类型使用不同 quality rubric
- 公开文章不会用 PRD 标准评估
- PRD 不会用公众号成品吸引力作为第一标准
- 技术文档不会为了好读牺牲准确性
- `general-writing` 不会抢占明确文体任务
- `personal-tech-research-engine` 的输出能被多个内容类型消费
- 新增内容类型时，只需要新增 profile 和 rubric，不需要重写整个系统

## 12. Review 时重点看

请重点看这些判断：

1. 4 个 skill 的边界是否清楚。
2. `general-writing` 是否应该作为底座，而不是万能入口。
3. 产品里用 `contentType`，agent 层用 `skill`，这个抽象是否合理。
4. PRD 的优先级 `用 > 真 > 清晰 > 完整 > 美 > 像` 是否准确。
5. 技术文档的优先级 `准 > 可执行 > 完整 > 清晰 > 美 > 像` 是否准确。
6. 第一版是否应该先抽 `ContentTask / WorkflowProfile / QualityRubric`。
7. 通用写作是否应该最后做，避免产品过早泛化。
8. 是否应该增加 `contentSubtype`，用来承载技术文档的 tutorial/how-to/reference 等细分类型。
9. 外部最佳实践是否已经被抽象成产品结构，而不是变成模板堆砌。

## 13. 参考资料

本版补充参考了这些来源：

- [Diátaxis](https://diataxis.fr/)，技术文档的 tutorial / how-to / reference / explanation 四象限。
- [The Good Docs Project templates](https://github.com/thegooddocsproject/templates)，开源技术文档模板和 concept / task / reference 分类。
- [GitHub Docs best practices](https://docs.github.com/en/contributing/writing-for-github-docs/best-practices-for-github-docs)，用户需求、内容类型、可扫描性和文档结构。
- [Google Developer Documentation Style Guide](https://developers.google.com/style/)，开发者文档风格和清晰一致的技术表达。
- [Google Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html)，最小可用文档、随代码更新、删除过期文档。
- [Atlassian PRD Guide](https://www.atlassian.com/agile/product-management/requirements)，PRD 的 shared understanding、just enough context、out-of-scope、协作维护。
- [Google Search people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)，公开内容的读者价值、原创性、可信度和经验边界。
- [GOV.UK content design](https://www.gov.uk/guidance/content-design/writing-for-gov-uk)，以 user need 为中心的内容设计。
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com/)，清晰、有用、友好、适合场景的通用内容原则。

## 14. 下一步

如果这个分层确认，下一份实施计划应该先做产品信息架构改造，而不是马上写 4 个完整 skill。

第一条实施切片建议是：

```text
ContentTask.contentType
-> ContentTask.contentSubtype
-> WorkflowProfile registry
-> QualityRubric registry
-> public_article profile 接入
-> prd / technical_doc / general 的轻量 profile 占位
```

这样可以先把系统从「单一写作链路」升级成「多内容类型编排」，后续再逐个补强每种文体的 workflow 和 skill。
