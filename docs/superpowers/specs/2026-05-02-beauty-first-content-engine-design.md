# Beauty-First Personal Tech Content Engine Design

## Background

The original PRD defines the product as a personal technical content finishing workbench. Its initial priority order is:

`真 > 像 > 美`

That order makes sense for avoiding ordinary AI writing failures, but it also keeps presentation and finished-work quality too late in the workflow. The current writing-engine design reflects that old order directly:

`task -> material -> bedrock -> outline -> draft -> rewrite -> export`

In that design, truth is protected by confirmed bedrock and outline, style is applied during rewrite, and presentation is applied during export. This creates a stable writing pipeline, but it does not make the article feel like a finished public work from the beginning.

The revised product strategy is:

`美 > 真 > 像`

Here, `美` does not mean decoration or visual polish only. It means finished-work appeal: topic pull, opening hook, narrative shape, reader motivation, pacing, emotional curve, channel fit, and final publishable form.

This shift is informed by `khazix-writer`, whose strongest reusable value is not a fixed personal voice, but a public-article method:

- HKR topic quality: Happy, Knowledge, Resonance
- concrete scene-first opening
- personal participation and real experience boundaries
- story-driven explanation instead of textbook explanation
- rhythm, callbacks, and main-thread pullback
- strict anti-AI-flavor checks
- final human-feeling review

The product should absorb those methods as article-finishing primitives, not as a hard-coded Khazix impersonation layer.

## Goal

Reframe the personal technical content engine so that the first product question is:

`Is this article worth reading and worth publishing?`

Only after that should the system ask:

`Is every important claim supported and bounded?`

Only after both should it ask:

`Does this sound like the user?`

The first version should support a single strong scenario:

`A personal technical author turns a technical topic, notes, code, research materials, and historical writing samples into a public-ready technical article with strong finished-work appeal, traceable truth, and reasonable personal style fit.`

## Chosen Approach

The recommended approach is:

**Beauty-first writing orchestration with research-backed truth gates and style as the final fitting pass.**

This means:

- `personal-tech-writing-engine` owns article appeal, narrative structure, channel-specific finished form, and style fitting.
- `personal-tech-research-engine` owns evidence inventory, source quality, traceable research packages, conflicts, and open questions.
- `khazix-writer` is abstracted into reusable content-quality rules, not copied as a single author persona.
- the writing workflow starts with an `Appeal Brief`, not with an information bedrock.
- truth is still a hard gate, but it is the second gate, not the first creative move.

Rejected alternatives:

- **Only change the PRD priority text**
  - Low implementation cost, but misleading.
  - The current pipeline would still behave as `真 > 像 > 美` because presentation remains an export concern.

- **Fully split research and writing with no feedback loop**
  - Clean boundaries, but too rigid.
  - Writing appeal often changes what evidence is needed, so the writing engine must be able to request additional research.

## Product Repositioning

The product should be described as:

`a beauty-first technical article finishing engine for personal technical authors`

It is not:

- a general AI writer
- a style imitation tool
- a research summarizer
- a Markdown formatter
- a one-click publishing bot

Its job is to help a technical author produce an article that has:

1. finished-work appeal
2. evidence-backed credibility
3. personal expression fit

The order matters.

## Priority Semantics

### Beauty

`美` is the top-level product constraint. It includes:

- topic pull
- reader curiosity
- public readability
- opening hook
- narrative prototype
- rhythm and pacing
- emotional curve
- concrete scenes and examples
- knowledge delivery that feels natural
- callback and ending closure
- title, summary, paragraph density, and channel preview

Beauty is not allowed to fabricate facts or fake experience. It may choose a stronger angle, a better opening, a more readable structure, or a more compelling channel form, but it cannot invent unsupported claims.

### Truth

`真` is the credibility gate. It includes:

- source traceability
- explicit evidence
- claim boundaries
- uncertainty marking
- no fake personal experience
- no unsupported conclusion disguised as judgment
- no average-force completeness

Truth protects the product from becoming polished misinformation.

### Likeness

`像` is the style-fitting layer. It includes:

- opening habits
- explanation habits
- judgment habits
- rhythm preferences
- ending habits
- banned expressions
- user-specific revision preferences

Likeness must not override beauty or truth. If a style trait makes the article less readable or less credible, the system should weaken that trait.

## New Core Workflow

The old workflow is:

`task -> material -> bedrock -> outline -> draft -> rewrite -> export`

The revised workflow should be:

`intent -> appeal brief -> evidence bedrock -> narrative outline -> draft -> truth check -> style pass -> publication package -> final quality report`

### 1. Intent

The user starts with a natural-language topic, target reader, optional channel, and optional materials.

The system should keep task creation light. The user should not need to fill a complete article brief before starting.

### 2. Appeal Brief

This is the new first-class object.

It answers:

- why this article is worth reading
- who would care
- what curiosity hook exists
- what knowledge payoff exists
- what resonance exists
- which narrative prototype fits
- what concrete opening candidates exist
- what channel shape is likely

The first version should score the topic with HKR:

- `Happy`: curiosity, surprise, playfulness, or tension
- `Knowledge`: useful or non-obvious information
- `Resonance`: emotional or practical reader connection

If a topic scores poorly, the system should suggest angle changes before generating a full article.

### 3. Evidence Bedrock

The evidence bedrock replaces the old truth-first information bedrock as the second major object.

It answers:

- what claims can be supported
- which materials support each claim
- what conflicts exist
- what is still uncertain
- what must not be written as fact
- what personal experience is available
- what personal experience is missing

This object may be generated from user materials, local Obsidian notes, and research packages from `personal-tech-research-engine`.

### 4. Narrative Outline

The narrative outline is not only a section list.

It should define:

- opening move
- reader promise
- narrative prototype
- emotional progression
- knowledge-drop points
- main-thread pullback lines
- evidence placement
- ending callback or closing judgment
- channel-specific structure notes

For the MVP, supported narrative prototypes should be:

- investigation / experiment
- product or tool experience
- phenomenon analysis
- tool sharing
- method sharing
- source or principle analysis

### 5. Draft

Draft generation should follow the narrative outline and evidence bedrock.

The draft may optimize for readability, scene, rhythm, and channel appeal, but it must keep claims attached to evidence and mark uncertainty.

### 6. Truth Check

Truth check happens after the first article-shaped draft because some credibility problems only appear once the article is actually written.

It should scan for:

- unsupported claims
- fake personal experience
- overconfident wording
- claims that outrun the evidence
- missing source references
- over-complete AI-sounding sections
- places where a stronger story damaged factual accuracy

The system should produce a repair plan, not just a score.

### 7. Style Pass

The style pass applies user-specific expression patterns only after article shape and truth have been stabilized.

It may change:

- opening texture
- sentence rhythm
- transition style
- explanation tone
- judgment wording
- ending style

It may not change:

- core claims
- evidence boundaries
- narrative prototype
- article promise
- unresolved uncertainties

### 8. Publication Package

The publication package should produce channel-ready outputs:

- blog version
- WeChat version
- title candidates
- summary / intro candidates
- image placement suggestions
- code block and quote block treatment
- final Markdown or Obsidian write-back

The first version should not attempt a full image-generation pipeline. It should support image placement and cover-image brief generation before direct image generation.

### 9. Final Quality Report

The final report should reflect the new priority order:

1. `美`: article appeal and finished-work quality
2. `真`: support, boundaries, uncertainty, and traceability
3. `像`: user-style fit

This report replaces vague statements like "AI flavor reduced" with specific checks.

## Project Responsibilities

### personal-tech-research-engine

This project should remain the research production engine.

It owns:

- source collection
- ingestion and extraction
- material scoring
- source cards
- topic indexes
- research summaries
- weekly digest and triage
- duplicate and conflict detection
- evidence traceability

It should add or expose one writing-facing artifact:

`WritingResearchPackage`

This package should contain:

- question domain
- source scope
- candidate claims
- supporting evidence
- conflicting evidence
- open questions
- freshness notes
- source quality notes
- candidate article angles
- concrete examples or stories found in sources
- unusable or risky claims

The research engine should not generate finished articles. It should give the writing engine reliable material to work with.

### personal-tech-writing-engine

This project should become the article finishing engine.

It owns:

- task creation
- material import from Obsidian and local files
- appeal brief generation
- evidence bedrock generation
- narrative outline generation
- draft generation
- truth check
- style pass
- channel-specific publication package
- final quality report
- selected Obsidian write-back

It may request additional research when the evidence bedrock is too weak for the selected appeal angle.

### khazix-writer

This skill should be treated as a reference method library.

Reusable concepts:

- HKR scoring
- article prototype selection
- concrete opening patterns
- human-experience boundary
- knowledge delivery style
- pacing and pullback
- callback closure
- anti-template checks
- human-feeling final review

Non-reusable as product defaults:

- exact Khazix persona
- fixed slogans
- fixed ending signature
- exact banned punctuation rules for all users
- account-specific slang as universal style

The product should let Khazix-style rules exist as one style or methodology profile, while extracting generalizable content-quality rules into the default workflow.

## Revised Domain Model

### WritingTask

Existing task fields remain, with these additions:

- `preferredChannel`
- `appealStatus`
- `truthStatus`
- `styleStatus`

### AppealBrief

Fields:

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

### EvidenceBedrock

Fields:

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

### NarrativeOutline

Fields:

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

### TruthCheckReport

Fields:

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

### PublicationPackage

Fields:

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

### FinalQualityReport

Fields:

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

## Revised State Flow

The first implementation should evolve toward this state machine:

- `created`
- `appeal_review`
- `collecting_materials`
- `evidence_review`
- `narrative_review`
- `draft_ready`
- `truth_review`
- `style_ready`
- `publication_ready`
- `exported`

Rules:

- task creation starts at `created`
- appeal brief generation moves to `appeal_review`
- adding materials moves to `collecting_materials`
- evidence bedrock generation moves to `evidence_review`
- narrative outline requires confirmed appeal brief and evidence bedrock
- draft generation requires confirmed narrative outline
- truth check requires a draft
- style pass requires a passed or explicitly accepted truth report
- publication package requires a styled or truth-accepted version
- export requires a publication package

This state machine implements:

`美 > 真 > 像`

Beauty is introduced before evidence structuring. Truth gates the article before style fitting. Style improves expression only after article appeal and credibility are stable.

## MVP Boundary

The MVP should not attempt the whole future product.

It should focus on:

- CLI-first workflow
- local mock application service
- file-backed persistence
- Obsidian material import
- appeal brief generation with HKR
- evidence bedrock generation from provided materials
- narrative outline generation
- draft generation
- truth check report
- style pass using historical article samples
- blog and WeChat publication packages
- final quality report

The MVP should avoid:

- web UI
- automatic publishing
- full image generation
- complex style modeling
- team collaboration
- broad research automation inside the writing engine
- replacing `personal-tech-research-engine`

## CLI Surface Direction

The existing command surface can evolve without being discarded.

Recommended future commands:

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

For migration, existing `bedrock` commands can remain as aliases or internal implementation details until the new `evidence` naming is fully adopted.

## Testing Strategy

Tests should protect the product priority order, not only API mechanics.

### Domain Tests

- `AppealBrief` requires HKR fields.
- `EvidenceBedrock` preserves conflicts, uncertainties, and do-not-claim fields.
- `NarrativeOutline` links both appeal and evidence objects.
- `TruthCheckReport` can fail without corrupting the current article version.

### Workflow Tests

- narrative generation fails without confirmed appeal and evidence.
- style pass fails unless truth has passed or been explicitly accepted.
- publication package generation uses channel-specific rules.
- export fails without publication package.

### Generator Tests

- appeal generation identifies weak HKR topics.
- evidence generation marks unsupported claims as uncertainty or do-not-claim.
- narrative generation includes opening move, reader promise, and ending move.
- truth check catches fake personal experience language when no personal material supports it.
- style pass preserves claims and evidence boundaries.

### End-to-End Smoke Test

The smoke test should cover:

`task create -> appeal generate/confirm -> material import -> evidence generate/confirm -> narrative generate/confirm -> draft generate -> truth check -> style pass -> publication package -> export`

Success criteria:

- all stages produce persisted records
- invalid stage calls fail with stable errors
- final package contains channel-ready content
- quality report follows `美 > 真 > 像`
- no stage silently invents unsupported claims

## Migration Strategy

The current writing engine already has a useful protocol-first architecture:

- CLI
- mock server
- shared contracts
- services
- repositories
- generators
- state guards

The migration should preserve that architecture and change the workflow objects incrementally.

Recommended sequence:

1. Add `AppealBrief` as a new object before bedrock.
2. Rename or evolve `InformationBedrock` into `EvidenceBedrock`.
3. Evolve `ArticleOutline` into `NarrativeOutline`.
4. Add `TruthCheckReport`.
5. Split rewrite into `style pass` and keep rewrite as a compatibility command.
6. Evolve export into `PublicationPackage` plus final export.
7. Add `FinalQualityReport`.
8. Add research-package import contract from `personal-tech-research-engine`.

This keeps the existing project useful while shifting its product behavior toward the new strategy.

## Acceptance Criteria

The redesign is successful when:

- a new article task starts by evaluating article appeal, not by producing facts first
- weak topics can be diagnosed before full drafting
- a narrative outline contains reader-facing article shape, not only sections
- research evidence remains traceable and bounded
- truth check can block or repair a beautiful but unsupported draft
- style fitting cannot change core claims or evidence boundaries
- WeChat and blog packages feel like different publication forms, not the same Markdown with different labels
- the final report evaluates beauty first, truth second, likeness third
- `personal-tech-research-engine` remains responsible for research assets rather than finished article writing

## Open Decisions

The following decisions should be made during implementation planning:

- whether `bedrock` remains a public CLI term or becomes internal-only
- whether HKR scores are numeric, qualitative, or both
- how explicit the user confirmation gate should be for low-HKR topics
- whether truth-check failure blocks style pass by default or allows manual override
- what minimum shape a `WritingResearchPackage` must have for the first cross-project integration

## Next Step

After this spec is reviewed and approved, the next artifact should be an implementation plan for `personal-tech-writing-engine`.

That plan should focus on the first vertical slice:

`appeal brief -> evidence bedrock -> narrative outline -> draft -> truth check -> style pass -> publication package`

The first implementation should remain CLI-first and file-backed, because that matches the current repository architecture and keeps the product behavior testable before adding a UI.
