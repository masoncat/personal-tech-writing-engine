# 美优先的个人技术内容成品引擎设计，中文 Review 版

## 0. 一句话结论

这次重析后的产品方向是：

**先把技术文章做成一篇值得点开、值得读完、值得发布的作品，再用证据和边界保证可信，最后再做个人风格贴合。**

新的策略优先级是：

```text
美 > 真 > 像
```

这里的「美」不是单纯排版、封面、视觉包装，而是更广义的成品吸引力，包括：

- 选题有没有钩子
- 开头能不能抓人
- 文章有没有叙事主线
- 读者有没有继续读下去的动力
- 知识点是不是自然进入
- 节奏是不是顺
- 结尾有没有作品闭合感
- 博客版和公众号版是不是接近可发布状态

## 1. 为什么要改

原 PRD 的核心排序是：

```text
真 > 像 > 美
```

这个排序能防止普通 AI 写作最常见的问题，比如空泛、虚假、模板化、不像本人。但它也带来一个副作用：

**产品很容易先变成一个严肃的信息加工器，最后才补一点风格和排版。**

当前 `personal-tech-writing-engine` 的设计也确实体现了这个顺序：

```text
task -> material -> bedrock -> outline -> draft -> rewrite -> export
```

在这个链路里：

- `bedrock` 和 `outline` 保护真实性
- `rewrite` 才开始处理风格
- `export` 才开始处理发布形态

问题是，文章的成品感不是最后一步贴上去的。一个公众号长文或者博客文章，能不能成立，往往从选题角度、开头方式、叙事原型和读者情绪路径就已经决定了。

所以这次设计把第一个产品问题改成：

```text
这篇文章值得读吗，值得发吗？
```

然后才问：

```text
它的关键判断站得住吗？
```

最后才问：

```text
它像不像用户本人？
```

## 2. `khazix-writer` 给这个产品的启发

`khazix-writer` 不应该被理解成「模仿卡兹克语气」的插件。

它真正有价值的是一套公众号长文成品方法论：

- 用 HKR 判断选题有没有传播和阅读价值
- 从具体事件、具体场景、具体反应切入
- 强调亲自下场和真实经历边界
- 知识点要像「聊着聊着顺手掏出来」，不是教科书科普
- 用叙事节奏、扣主线句和回环呼应维持阅读动力
- 明确识别 AI 味、模板腔、空泛判断
- 最后用「活人感」做终审

这些东西应该被抽象成产品默认的内容质量规则。

但下面这些不应该作为通用默认值：

- 卡兹克本人的固定人设
- 固定 slogan
- 固定结尾签名
- 所有用户都共用的标点禁令
- 账号专属口头禅
- 账号专属 slang

换句话说：

**学方法，不硬套人格。**

## 3. 新产品定位

建议把产品定位调整为：

```text
一个美优先的个人技术文章成品引擎。
```

它不是：

- 通用 AI 写作工具
- 单纯风格模仿工具
- 调研摘要工具
- Markdown 排版器
- 一键发布机器人

它要帮助个人技术作者产出一种更接近终稿的内容：

1. 先有成品吸引力
2. 再有证据支撑和可信边界
3. 最后贴近用户本人表达

## 4. 三个关键词重新定义

### 4.1 美

「美」是第一优先级，但它不是装饰。

它包括：

- 选题拉力
- 读者好奇心
- 开头钩子
- 叙事原型
- 文章节奏
- 情绪曲线
- 具体场景和例子
- 知识点进入方式
- 回环和收尾
- 标题、摘要、段落密度、渠道预览

美可以让文章换一个更强角度、更好开头、更顺结构、更适合公众号或博客。

但美不能编造事实，不能假装用户亲自经历过某件事，也不能把没证据的判断写成确定结论。

### 4.2 真

「真」是第二层硬闸。

它包括：

- 来源可追溯
- 证据明确
- 论断有边界
- 不确定项被标出来
- 不伪造个人经历
- 不把模型推断伪装成事实
- 不为了完整而平均用力写满

真不是第一创作动作，但它必须能拦住一篇「很好看但站不住」的文章。

### 4.3 像

「像」是最后的风格贴合层。

它包括：

- 用户怎么开头
- 用户怎么解释复杂概念
- 用户怎么下判断
- 用户怎么转场
- 用户怎么收尾
- 用户不喜欢哪些表达
- 用户实际改稿时的偏好

像不能压过美和真。

如果某个个人风格习惯让文章更难读，或者让事实边界变模糊，就应该弱化它。

## 5. 新主链路

旧链路是：

```text
task -> material -> bedrock -> outline -> draft -> rewrite -> export
```

新链路建议改成：

```text
intent
-> appeal brief
-> evidence bedrock
-> narrative outline
-> draft
-> truth check
-> style pass
-> publication package
-> final quality report
```

中文理解如下：

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

## 6. 每一步做什么

### 6.1 Intent，写作意图

用户用一句自然语言开始：

- 想写什么
- 写给谁看
- 大概发在哪里
- 有哪些材料

这里不能一上来让用户填复杂表单。

### 6.2 Appeal Brief，成品力简报

这是新增的第一核心对象。

它回答：

- 这篇文章为什么值得读
- 谁会关心
- 好奇心钩子是什么
- 知识收益是什么
- 情绪共鸣是什么
- 更适合哪种叙事原型
- 可以怎么开头
- 更适合博客还是公众号

首期用 HKR 做选题诊断：

- `Happy`，有没有趣味、悬念、反差、惊讶
- `Knowledge`，有没有信息量和非显而易见的知识收益
- `Resonance`，有没有情绪共鸣或现实痛点

如果 HKR 太弱，系统应该先建议换角度，而不是直接生成正文。

### 6.3 Evidence Bedrock，证据底座

证据底座是第二核心对象。

它回答：

- 哪些判断可以写
- 每个判断由哪些材料支持
- 哪些材料互相冲突
- 哪些点还不确定
- 哪些话不能写成事实
- 用户是否真的有对应经历
- 如果没有经历，应该怎么降级表达

它可以来自：

- 用户上传材料
- Obsidian 笔记
- 历史文章
- `personal-tech-research-engine` 输出的 research package

### 6.4 Narrative Outline，叙事主线

叙事主线不是普通大纲。

它要定义：

- 开头怎么切
- 给读者的阅读承诺是什么
- 用哪种文章原型
- 情绪怎么推进
- 知识点在哪些位置掉出来
- 哪些地方需要扣回主线
- 证据放在哪里
- 结尾怎么回环或收束
- 博客版和公众号版有什么差异

首期支持这些原型：

- 调查实验型
- 产品或工具体验型
- 现象解读型
- 工具分享型
- 方法论分享型
- 源码或技术原理解析型

### 6.5 Draft，初稿

初稿要根据叙事主线和证据底座生成。

它可以优先优化：

- 可读性
- 具体场景
- 文章节奏
- 渠道适配

但不能脱离证据底座。

### 6.6 Truth Check，真实性检查

真实性检查放在初稿之后。

原因是，有些问题只有文章真的写出来才会暴露，比如：

- 为了故事好看，把判断写过头了
- 明明没有亲身经历，却写得像亲自做过
- 证据只支持 A，却写成了 A+B
- 为了完整，补了一段正确废话
- 某些结论没有引用来源

Truth Check 不只是打分，而是给出修复计划。

### 6.7 Style Pass，风格贴合

风格贴合必须发生在文章形状和事实边界稳定之后。

它可以改：

- 开头质感
- 句子节奏
- 转场方式
- 解释语气
- 判断措辞
- 收尾方式

它不能改：

- 核心论点
- 证据边界
- 叙事原型
- 文章承诺
- 未解决的不确定项

### 6.8 Publication Package，发布成品包

发布成品包输出接近最终发布态的内容。

首期包括：

- 博客版
- 公众号版
- 标题候选
- 摘要或导语候选
- 插图位置建议
- 封面图 brief
- 代码块和引用块处理建议
- Markdown 或 Obsidian 写回结果

首期不建议做完整图片生成流水线。

更合理的是先生成：

- 哪些地方需要图
- 图要表达什么
- 封面图应该是什么概念

### 6.9 Final Quality Report，最终质量报告

最终报告按新优先级输出：

1. 美，成品吸引力和可发布程度
2. 真，证据、边界、不确定项、可追溯性
3. 像，用户风格贴合程度

这比「AI 味减少」这种模糊评价更可执行。

## 7. 两个项目怎么承接

### 7.1 `personal-tech-research-engine`

这个项目继续负责研究生产。

它拥有：

- source collection
- ingestion / extraction
- material scoring
- source card
- topic index
- research summary
- weekly digest / triage
- duplicate detection
- conflict detection
- evidence traceability

它不负责生成成品文章。

它应该新增或暴露一个写作侧可消费的对象：

```text
WritingResearchPackage
```

这个包里应该有：

- 研究问题
- 来源范围
- 候选论断
- 支持证据
- 反向证据
- 冲突点
- 开放问题
- 来源质量说明
- 新鲜度说明
- 候选文章角度
- 可用具体案例
- 高风险或不可写结论

### 7.2 `personal-tech-writing-engine`

这个项目承接成品文章链路。

它拥有：

- 任务创建
- 材料导入
- 成品力简报
- 证据底座
- 叙事主线
- 初稿
- 真实性检查
- 风格贴合
- 发布成品包
- 最终质量报告
- 选定内容写回 Obsidian

当证据底座不足以支撑某个强角度时，它可以请求 research-engine 补研究。

## 8. 核心对象

### 8.1 WritingTask

在现有字段基础上增加：

- `preferredChannel`
- `appealStatus`
- `truthStatus`
- `styleStatus`

### 8.2 AppealBrief

字段：

- `id`
- `taskId`
- `targetReader`
- `channel`
- `hkr`
- `readerMotivation`
- `topicPromise`
- `angleCandidates`
- `openingCandidates`
- `narrativePrototype`
- `risks`
- `confirmed`

### 8.3 EvidenceBedrock

字段：

- `id`
- `taskId`
- `theme`
- `coreQuestion`
- `claimBlocks`
- `evidenceRefs`
- `conflicts`
- `uncertainties`
- `doNotClaim`
- `personalExperienceAvailable`
- `personalExperienceMissing`
- `researchPackageRefs`
- `confirmed`

### 8.4 NarrativeOutline

字段：

- `id`
- `taskId`
- `appealBriefId`
- `evidenceBedrockId`
- `title`
- `prototype`
- `openingMove`
- `readerPromise`
- `sections`
- `knowledgeDropPoints`
- `pullbackLines`
- `endingMove`
- `channelNotes`
- `confirmed`

### 8.5 TruthCheckReport

字段：

- `id`
- `taskId`
- `versionId`
- `unsupportedClaims`
- `overconfidentClaims`
- `fakeExperienceRisks`
- `evidenceGaps`
- `uncertaintyRepairs`
- `recommendedEdits`
- `passed`

### 8.6 PublicationPackage

字段：

- `id`
- `taskId`
- `versionId`
- `channel`
- `titleCandidates`
- `summary`
- `content`
- `imagePlacementNotes`
- `coverBrief`
- `format`
- `outputPath`

### 8.7 FinalQualityReport

字段：

- `id`
- `taskId`
- `versionId`
- `beautyScore`
- `truthScore`
- `likenessScore`
- `beautyFindings`
- `truthFindings`
- `likenessFindings`
- `releaseReadiness`

## 9. 状态流

建议状态机演进为：

```text
created
-> appeal_review
-> collecting_materials
-> evidence_review
-> narrative_review
-> draft_ready
-> truth_review
-> style_ready
-> publication_ready
-> exported
```

关键规则：

- 创建任务后是 `created`
- 生成成品力简报后进入 `appeal_review`
- 添加材料后进入 `collecting_materials`
- 生成证据底座后进入 `evidence_review`
- 叙事主线必须依赖已确认的成品力简报和证据底座
- 初稿必须依赖已确认的叙事主线
- 真实性检查必须依赖初稿
- 风格贴合必须依赖通过或人工接受的 truth report
- 发布成品包必须依赖风格版或 truth-accepted 版本
- 导出必须依赖 publication package

这个状态机对应：

```text
美先进入，真负责硬闸，像最后贴合。
```

## 10. MVP 范围

第一版建议只做 CLI-first 的本地闭环。

包括：

- CLI 工作流
- local mock application service
- file-backed persistence
- Obsidian 材料导入
- HKR 成品力简报
- 基于已有材料的证据底座
- 叙事主线
- 初稿
- 真实性检查报告
- 基于历史文章样本的风格贴合
- 博客和公众号发布成品包
- 最终质量报告

第一版不做：

- Web UI
- 自动发布
- 完整图片生成流水线
- 复杂风格建模
- 团队协作
- writing-engine 内部做大规模开放研究
- 替代 `personal-tech-research-engine`

## 11. CLI 方向

现有命令不需要一次性推翻，可以逐步演进。

建议未来命令形态：

```bash
ptce task create --title "..." --article-type source-analysis --reader "..." --channel wechat

ptce appeal generate --task-id <id>
ptce appeal confirm --task-id <id> --appeal-id <id>

ptce material add --task-id <id> --type note --file ./note.md
ptce material import-obsidian --task-id <id> --vault-path <vault> --path <note-or-folder>
ptce material import-research-package --task-id <id> --file ./research-package.json

ptce evidence generate --task-id <id>
ptce evidence confirm --task-id <id> --evidence-id <id>

ptce narrative generate --task-id <id>
ptce narrative confirm --task-id <id> --outline-id <id>

ptce draft generate --task-id <id>
ptce truth check --task-id <id> --version-id <id>
ptce style run --task-id <id> --version-id <id> --instruction "更像我，但不要牺牲可信度"
ptce publish package --task-id <id> --version-id <id> --channel wechat
ptce quality report --task-id <id> --version-id <id>
ptce export run --task-id <id> --package-id <id> --target obsidian
```

迁移期可以让旧的 `bedrock` 命令继续存在，作为兼容命令或内部实现细节。

## 12. 测试重点

测试不应该只测 API 能不能通。

它应该保护这个产品优先级：

```text
美 > 真 > 像
```

### 12.1 领域对象测试

- `AppealBrief` 必须包含 HKR 字段
- `EvidenceBedrock` 必须保留冲突、不确定项和不可声明内容
- `NarrativeOutline` 必须同时关联 appeal 和 evidence
- `TruthCheckReport` 失败时不能污染当前文章版本

### 12.2 工作流测试

- 没有确认 appeal 和 evidence 时不能生成 narrative
- truth 未通过或未人工接受时不能做 style pass
- publication package 必须有渠道差异
- 没有 publication package 时不能 export

### 12.3 生成器测试

- appeal generator 能识别弱 HKR 选题
- evidence generator 能把不支持的声明放入 uncertainty 或 doNotClaim
- narrative generator 必须生成 opening move、reader promise、ending move
- truth check 能识别无材料支持的伪亲身经历
- style pass 不能改变核心论点和证据边界

### 12.4 端到端 smoke test

覆盖链路：

```text
task create
-> appeal generate/confirm
-> material import
-> evidence generate/confirm
-> narrative generate/confirm
-> draft generate
-> truth check
-> style pass
-> publication package
-> export
```

成功标准：

- 每个阶段都有持久化记录
- 错误阶段调用返回稳定错误
- 最终 package 是渠道可发布内容
- quality report 按 `美 > 真 > 像` 输出
- 没有任何阶段静默编造无证据结论

## 13. 迁移策略

现有 `personal-tech-writing-engine` 的架构是可以保留的：

- CLI
- mock server
- shared contracts
- services
- repositories
- generators
- state guards

建议按这个顺序迁移：

1. 新增 `AppealBrief`，放在 bedrock 前面
2. 把 `InformationBedrock` 演进为 `EvidenceBedrock`
3. 把 `ArticleOutline` 演进为 `NarrativeOutline`
4. 新增 `TruthCheckReport`
5. 把 rewrite 拆成 style pass，同时保留 rewrite 兼容命令
6. 把 export 演进为 publication package + final export
7. 新增 `FinalQualityReport`
8. 增加来自 `personal-tech-research-engine` 的 research-package import contract

这样可以保留现有项目价值，同时把产品行为从 `真 > 像 > 美` 改成 `美 > 真 > 像`。

## 14. 验收标准

这次重设计成功的标准：

- 新文章任务先评估成品吸引力，而不是先产出事实底座
- 弱选题能在写初稿前被诊断出来
- 叙事主线不只是章节列表，而是包含读者承诺、开头、节奏和结尾
- 研究证据保持可追溯
- truth check 能拦住「好看但站不住」的初稿
- style pass 不能改变核心论点和证据边界
- 公众号版和博客版不是同一份 Markdown 换标签
- final quality report 按 `美 -> 真 -> 像` 输出
- `personal-tech-research-engine` 继续负责研究资产，不负责写成品文章

## 15. 需要 Review 时重点看的问题

请重点看这些判断是否成立：

1. `美` 是否应该作为广义成品吸引力，而不是视觉排版。
2. `AppealBrief` 是否应该成为第一核心对象。
3. `TruthCheck` 放在初稿之后是否合理。
4. `StylePass` 是否应该从 rewrite 中拆出来，放到 truth gate 后面。
5. `personal-tech-research-engine` 输出 `WritingResearchPackage` 这个边界是否清晰。
6. 第一版是否应该继续 CLI-first，而不是直接做 Web UI。
7. `khazix-writer` 的抽象方式是否正确，是学方法，不复制人设。

## 16. 下一步

如果这份中文 review 版确认无问题，下一步进入实施计划。

实施计划建议只覆盖第一条竖切：

```text
appeal brief
-> evidence bedrock
-> narrative outline
-> draft
-> truth check
-> style pass
-> publication package
```

先把链路跑通，再讨论 UI、图片生成、自动发布和更复杂的风格学习。
