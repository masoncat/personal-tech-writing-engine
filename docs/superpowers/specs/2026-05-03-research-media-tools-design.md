# 搜索、抓取与配图工具层设计

## 0. 一句话结论

本次要新增的不是「写作流程里的一个搜索步骤」，而是一套可复用的通用工具层：

```text
@ptce/research-media-tools
```

它负责四类能力：

1. 搜文：用 Tavily 发现最新事实、新闻和数据源。
2. 抓取：对候选 URL 抓正文、页面内图片和结构化信息，避免只依赖 SEO snippet。
3. 配图：按文章上下文从页面内图片、Unsplash、KLIPY、memegen 中找候选图。
4. 生图：当候选图和上下文不匹配时，用 OpenAI `gpt-image-2` 生成图。

这套工具最终服务于文章内容。配图不是为了填坑，而是为了帮助读者理解、感受或记住当前段落。

核心原则：

```text
宁缺毋滥。
```

如果候选图和上下文不匹配，就拒绝使用；如果生成图也不能准确服务段落，就留空。

## 1. 背景与问题

当前 PTCE 写作引擎的基础能力已经可用，但公开文章尤其是公众号文章还缺两类关键能力：

- 真实数据支撑：用户给的信息可能不完整，文章需要搜最新消息、公告、报告和数据作为证据。
- 文章配图：文章需要根据语境找真实资讯图、概念图、热梗图，找不到合适图片时才生图。

这些能力不能只做成 `public-article-writing` 的内部逻辑。原因是：

- 搜文、抓网页、搜图、生图是跨项目通用能力。
- 写作任务需要保存来源边界，但搜索工具本身不应该依赖 `ContentTask`。
- 未来其他项目也会用这些工具，例如产品调研、竞品分析、知识库更新、运营素材生成。

所以第一版应以独立 workspace package 的方式建设，PTCE 只是调用方之一。

## 2. 范围

### 2.1 本次范围内

第一版包含：

- 新增独立包 `@ptce/research-media-tools`。
- 定义统一的 search、extract、media、generation 类型。
- 接入真实 provider：
  - Tavily：搜文和新闻发现。
  - Internal Page Extractor：抓 URL 正文和页面内图片。
  - Unsplash：普通照片和概念配图。
  - KLIPY：热梗图、GIF、贴纸、meme 候选。
  - memegen：基于模板生成文字梗图。
  - OpenAI `gpt-image-2`：生成概念图、插画图、兜底配图。
- 提供 deterministic mock provider，保证测试稳定。
- 提供 CLI 入口，方便 agent 和其他项目调用。
- 在 PTCE writing skill 中声明调用规则和 artifact 形态。

### 2.2 本次范围外

第一版不做：

- 图片版权自动法律判断。
- 自动发公众号或博客。
- 复杂浏览器渲染抓取。
- 自动下载所有远程图片到本地资产库。
- 以图搜图能力。PicImageSearch 以后可以作为 `ReverseImageSearchProvider` 加入，但不是本轮主路径。
- 把搜索/生图能力塞进 `ContentTaskService` 的固定 runner。

## 3. 总体架构

整体架构如下：

```text
Writing Agent / Other Project
        |
        v
Research Media CLI / SDK
        |
        v
@ptce/research-media-tools
        |
        +-- WebSearchProvider(Tavily)
        +-- PageExtractionProvider(Internal)
        +-- PhotoSearchProvider(Unsplash)
        +-- MemeSearchProvider(KLIPY)
        +-- MemeGenerationProvider(memegen)
        +-- ImageGenerationProvider(OpenAI gpt-image-2)
        |
        v
ResearchPackage / MediaPlan
        |
        v
PTCE ContentArtifact / external consumer
```

边界：

- 工具包不创建 PTCE task。
- 工具包不判断文章整体质量。
- 工具包只返回结构化结果、候选素材、风险和来源边界。
- PTCE agent 根据 writing skill 决定何时调用工具、如何写入 artifact。

## 4. Provider 分层

### 4.1 WebSearchProvider：Tavily

用途：

- 搜最新消息。
- 搜官方公告、报告、数据源。
- 搜新闻和行业事件。
- 搜文章事实引用所需的来源页。

接口：

```ts
interface WebSearchProvider {
  searchWeb(request: WebSearchRequest): Promise<WebSearchResult>;
}
```

关键请求字段：

```ts
interface WebSearchRequest {
  query: string;
  topic?: 'general' | 'news';
  maxResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  includeRawContent?: boolean;
  includeImages?: boolean;
}
```

关键结果字段：

```ts
interface WebSearchItem {
  title: string;
  url: string;
  sourceDomain: string;
  snippet: string;
  publishedAt?: string;
  score?: number;
  rawContent?: string;
  images?: DiscoveredImage[];
  evidenceStrength: 'candidate' | 'snippet_only' | 'extracted' | 'verified';
}
```

规则：

- Tavily 结果默认只是候选来源。
- 搜索摘要不能直接作为强证据。
- 需要引用的重要来源必须进入页面抓取。
- 只有页面抽取成功并定位到正文片段后，才能作为强证据。

### 4.2 PageExtractionProvider：页面正文和页面内图文

用途：

- 对 Tavily 搜到的候选 URL 抓取正文。
- 读取页面标题、作者、发布时间、canonical URL。
- 抓页面内图片、caption、alt、figure 上下文。
- 避免把 SEO description 当成事实来源。

接口：

```ts
interface PageExtractionProvider {
  extractPage(request: PageExtractionRequest): Promise<PageExtractionResult>;
}
```

关键结果字段：

```ts
interface PageExtractionResult {
  url: string;
  canonicalUrl?: string;
  title?: string;
  author?: string;
  publishedAt?: string;
  extractedAt: string;
  textContent: string;
  evidenceBlocks: EvidenceBlock[];
  images: ExtractedPageImage[];
  warnings: ExtractionWarning[];
}
```

页面内图片字段：

```ts
interface ExtractedPageImage {
  imageUrl: string;
  sourcePageUrl: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  nearbyText?: string;
  roleHint: 'hero' | 'inline' | 'logo' | 'avatar' | 'unknown';
}
```

规则：

- 对事实/新闻配图，优先使用页面内图片。
- 页面内图片必须保留 `sourcePageUrl` 和上下文。
- 如果页面是 paywall、403、JS-only、正文为空或图片防盗链，必须返回 warning。
- 抽取失败不能静默降级成搜索摘要。

### 4.3 PhotoSearchProvider：Unsplash

用途：

- 普通照片。
- 概念配图。
- 氛围图。
- 非事实型封面图。

接口：

```ts
interface PhotoSearchProvider {
  searchPhotos(request: PhotoSearchRequest): Promise<PhotoSearchResult>;
}
```

规则：

- Unsplash 图片不能当作新闻事实图。
- 结果必须保留摄影师、Unsplash 链接、图片来源页、download tracking URL。
- 当图片被选入文章媒体计划时，调用 Unsplash download tracking。
- 如果文章段落需要真实事件图片，Unsplash 候选应直接降权或拒绝。

### 4.4 MemeSearchProvider：KLIPY

用途：

- 搜热梗图。
- 搜 GIF、贴纸、短 clip、meme。
- 为文章里的情绪转场或玩笑段落找已有梗图。

接口：

```ts
interface MemeSearchProvider {
  searchMemes(request: MemeSearchRequest): Promise<MemeSearchResult>;
}
```

规则：

- 热梗图必须和文章语气匹配。
- 如果读者理解成本高、梗过时、语气不合，就拒绝。
- 保留 KLIPY 返回的来源、标题、content type、预览图和 attribution metadata。
- 梗图不能承担事实证明作用。

### 4.5 MemeGenerationProvider：memegen

用途：

- 基于经典模板生成文字梗图。
- 把文章中的一个观点、吐槽或对比做成梗图。

接口：

```ts
interface MemeGenerationProvider {
  listTemplates(): Promise<MemeTemplate[]>;
  generateMeme(request: MemeGenerationRequest): Promise<MemeGenerationResult>;
}
```

规则：

- 先选模板，再生成图片 URL。
- 生成文字必须来自文章上下文，不写无关段子。
- 如果梗图会削弱文章可信度或破坏语气，拒绝生成。

### 4.6 ImageGenerationProvider：OpenAI `gpt-image-2`

用途：

- 生成概念图。
- 生成插画图。
- 当搜索图片和上下文不匹配时兜底生成。

接口：

```ts
interface ImageGenerationProvider {
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
```

规则：

- 模型固定为 `gpt-image-2`。
- 所有生成图必须标记：
  - `generated: true`
  - `provider: openai`
  - `model: gpt-image-2`
- AI 图不能伪装成真实事件图、新闻图、产品截图或数据截图。
- 生成后仍然要经过 `MediaFitEvaluator`。
- 如果生成图也不匹配，返回 `leave_empty`。

## 5. 媒体不是填空：MediaNeedPlanner 与 MediaFitEvaluator

### 5.1 MediaNeedPlanner

`MediaNeedPlanner` 决定文章哪里真的需要图。

输入：

- 文章标题。
- 文章类型和渠道。
- 段落或小节内容。
- 读者和文章目的。

输出：

```ts
interface MediaNeed {
  id: string;
  articleSectionId?: string;
  context: string;
  intendedRole: 'fact_evidence' | 'concept' | 'mood' | 'meme' | 'cover' | 'transition';
  required: boolean;
  searchQuery: string;
  generationPrompt?: string;
  mustBeRealImage: boolean;
}
```

规则：

- 不是每个小节都需要图。
- 技术/产品文章可以有 3-5 个候选图位，但最终是否使用由适配评估决定。
- 如果图不能增加理解、情绪或记忆点，就不规划图位。

### 5.2 MediaFitEvaluator

`MediaFitEvaluator` 是硬门槛。

输入：

- 文章标题。
- 当前段落或小节上下文。
- 图片要承担的作用。
- 候选图片 metadata。

输出：

```ts
interface MediaFitDecision {
  fitScore: number;
  decision: 'use' | 'reject' | 'generate' | 'leave_empty';
  reason: string;
  usageBoundary: 'fact_image' | 'concept_photo' | 'meme' | 'generated_image' | 'not_usable';
  requiredDisclosure?: string;
}
```

评分维度：

- 语义匹配：图片内容是否真的对应当前段落。
- 信息价值：图片是否增加理解，而不是重复装饰。
- 语气匹配：梗图或 GIF 是否符合文章气质。
- 事实边界：图片是否会让读者误以为它是事实证据。
- 来源完整度：是否能追溯来源页、作者、caption、provider metadata。
- 发布风险：是否有明显版权、低俗、误导或品牌风险。

硬规则：

- `fact_evidence` 必须来自页面抓取或可信来源页。
- `concept_photo` 可以来自 Unsplash，但不能作为事实证据。
- `meme` 可以来自 KLIPY 或 memegen，但不能承担事实证明。
- `generated_image` 必须显式标注 AI 生成。
- `fitScore < 70` 默认拒绝。
- `fitScore < 85` 且图片承担事实或封面作用时，默认拒绝。
- 任何候选图如果会误导读者，就拒绝。

## 6. 媒体选择链路

媒体选择链路如下：

```text
Article context
-> MediaNeedPlanner 判断哪些位置真的需要图
-> Provider candidates 获取页面图、照片、梗图或模板
-> MediaFitEvaluator 严格筛选
-> 不匹配且允许生成时，调用 gpt-image-2
-> 生成图再次进入 MediaFitEvaluator
-> 仍不匹配则 leave_empty
-> 输出 MediaPlan artifact
```

不同图位的 provider 优先级：

| 图位意图 | Provider 顺序 | 备注 |
| --- | --- | --- |
| 事实/新闻图 | Tavily -> Page Extractor 页面内图片 | 不使用 Unsplash 或 AI 图替代事实图 |
| 普通概念配图 | Unsplash -> gpt-image-2 | Unsplash 不匹配才生成 |
| 热梗图 | KLIPY -> memegen -> gpt-image-2 | 生成图必须标记为 AI 或 generated meme |
| 封面图 | Unsplash -> gpt-image-2 | 必须高匹配，低分宁可不用 |
| 转场情绪图 | KLIPY -> Unsplash -> gpt-image-2 | 语气不合就留空 |

## 7. 输出模型

### 7.1 ResearchPackage

用于事实支撑：

```ts
interface ResearchPackage {
  id: string;
  querySet: WebSearchRequest[];
  sources: ResearchSource[];
  evidenceBlocks: EvidenceBlock[];
  unresolvedQuestions: string[];
  warnings: string[];
  createdAt: string;
}
```

### 7.2 MediaPlan

用于文章配图：

```ts
interface MediaPlan {
  id: string;
  articleTitle: string;
  needs: MediaNeed[];
  selections: MediaSelection[];
  rejectedCandidates: RejectedMediaCandidate[];
  sourceBoundary: MediaSourceBoundary[];
  createdAt: string;
}
```

选中图片：

```ts
interface MediaSelection {
  needId: string;
  decision: MediaFitDecision;
  asset: MediaAsset;
  placementHint?: string;
}
```

媒体资产：

```ts
interface MediaAsset {
  id: string;
  kind: 'page_image' | 'unsplash_photo' | 'klipy_meme' | 'memegen_image' | 'generated_image';
  url?: string;
  localPath?: string;
  title?: string;
  alt?: string;
  caption?: string;
  sourceUrl?: string;
  provider: string;
  author?: string;
  attribution?: string;
  generated: boolean;
  model?: string;
  prompt?: string;
}
```

## 8. CLI 设计

第一版 CLI 放在现有 `ptce` 下，但调用独立包：

```bash
ptce tools search web --query "..." --topic news --render json
ptce tools page extract --url "https://example.com/article" --render json
ptce tools search photo --query "remote work desk" --render json
ptce tools search meme --query "ship it" --render json
ptce tools meme generate --template drake --top "..." --bottom "..." --render json
ptce tools image generate --prompt "..." --model gpt-image-2 --render json
ptce tools media plan --context-file article.md --render json
```

环境变量：

```text
TAVILY_API_KEY
UNSPLASH_ACCESS_KEY
KLIPY_API_KEY
OPENAI_API_KEY
PTCE_TOOLS_PROVIDER_MODE=real|mock
```

规则：

- 缺少对应 key 时，真实 provider 返回配置错误。
- 测试默认使用 mock provider。
- CLI 输出默认结构化 JSON，方便 agent 读取。

## 9. PTCE 写作接入

### 9.1 Skill 规则

`ptce-writing` 和 `public-article-writing` 需要补充规则：

- 公开文章如果包含最新事实、公司动作、产品变化、市场数据，必须先生成 `research_package`。
- 文章最终必须有「来源边界」。
- 需要配图时，必须先生成 `media_plan`。
- 文章最终必须有「图片来源边界」。
- 不能把 Tavily snippet 直接当作强证据。
- 不能把 Unsplash 或 AI 图当作事实证据。
- 如果媒体计划没有合适图，可以不放图。

### 9.2 Artifact 类型

建议新增或约定以下 artifact type：

```text
research_package
page_extraction
media_plan
image_generation_record
source_boundary
media_source_boundary
```

这些 artifact 仍通过现有 `content artifact add` 写入，不需要改变 `ContentTaskService` 的主职责。

## 10. 错误处理

错误分三类：

1. 配置错误：缺 API key、provider 未启用、模型不可用。
2. 获取错误：搜索失败、抓取 403、页面为空、图片链接失效。
3. 质量错误：候选图不匹配、来源边界不足、事实证据不足。

质量错误不是系统失败。它应该进入结果：

```text
decision=reject 或 leave_empty
```

这样 agent 可以继续写文章，但不能假装已经找到了合适图或证据。

## 11. 测试策略

测试分层：

- 类型测试：请求和响应 schema 稳定。
- mock provider 测试：无网络、无 API key 时结果稳定。
- provider adapter 单元测试：请求参数映射正确，错误被标准化。
- media fit 测试：低匹配候选被拒绝，事实图不能被 AI 图替代。
- CLI 测试：命令解析和 JSON 输出稳定。
- PTCE 接入测试：`media_plan` 和 `research_package` 可作为 artifact 写入。

必须覆盖的关键用例：

- Tavily 搜到候选页，但页面抽取失败，结果标记 snippet-only。
- 页面抽取拿到正文和图片，事实图进入候选。
- Unsplash 图片与事实图位不匹配，被拒绝。
- KLIPY 梗图语气不匹配，被拒绝。
- 搜图全部不匹配后触发 `gpt-image-2`。
- `gpt-image-2` 生成图仍不匹配，最终 `leave_empty`。

## 12. 实施顺序

推荐分四步实现：

1. 建独立包与共享类型。
2. 做 mock provider、MediaNeedPlanner、MediaFitEvaluator 和 CLI 骨架。
3. 接入真实 provider：Tavily、Page Extractor、Unsplash、KLIPY、memegen、OpenAI。
4. 更新 writing skill 和 PTCE artifact 接入测试。

这个顺序保证第一步就能稳定测试，同时不把外部 API 不确定性带进核心写作状态模型。

## 13. 第一版设计决策

第一版采用以下明确决策：

- `media_plan` 默认不下载远程图片，只保存远程 URL、来源页和 attribution metadata。
- OpenAI `gpt-image-2` 生成图默认保存到本地 `artifacts/images/`，并记录 prompt、model、provider 和生成时间。
- `MediaFitEvaluator` 默认使用 deterministic rule-based 评分，保留可选模型评估接口，但测试和主流程不依赖模型评估。
- 如果 provider 缺少 API key，CLI 返回配置错误；不会自动切换到 mock provider，除非显式设置 `PTCE_TOOLS_PROVIDER_MODE=mock`。
- 媒体计划可以合法地产生零张可用图片。零可用图片不是失败，而是符合「宁缺毋滥」原则的结果。
