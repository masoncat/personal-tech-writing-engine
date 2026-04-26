# Build Retrospective Generator Design

## Background

The current CLI and mock workflow can complete the full task lifecycle:

`task -> material -> bedrock -> outline -> draft -> rewrite -> export`

That proves the product workflow skeleton is runnable, but it does not yet prove that the writing output is useful. The current mock generators still expose internal intermediate structures directly in the final article:

- `bedrock` is mostly source-summary concatenation
- `outline` is a fixed English three-section template
- `draft` prints internal fields like `Reader`, `Core question`, and `Evidence anchors`
- `rewrite` appends instructions and style cues instead of producing a cleaner new version

This makes the workflow technically complete but editorially weak. The next step is not to build a general-purpose writing engine. It is to make one important lane generate a readable first draft:

- `articleType=build-retrospective`
- `channel=blog`
- public-facing, WeChat-style short article

## Goal

Upgrade the mock writing pipeline so that this lane can generate a readable first draft that feels like a public project-retrospective article rather than an exposed internal template.

The target output is:

- first person
- short-form blog / WeChat opening article
- roughly `1200-1800` Chinese characters
- starts from a concrete problem or failure mode
- uses phase-based sectioning instead of dates or abstract headings
- includes actions, problems, and judgement calls
- ends with a clear takeaway

This is explicitly **not** a goal to produce publish-ready writing in every case. The goal is a usable first draft that a human editor can refine without first rebuilding the whole article.

## Non-Goals

- Do not optimize every `articleType`
- Do not build a full generic content planner
- Do not introduce real LLM generation
- Do not redesign the domain workflow or task stages
- Do not add new UI surfaces
- Do not solve long-form article generation yet

## Chosen Scope

The behavior change applies only when both conditions hold:

- `task.articleType === 'build-retrospective'`
- export target content is intended for `channel=blog`

Other task types may continue using the current generic fallback behavior.

This keeps the change focused and prevents a weak “average template” from polluting all writing paths.

## Success Criteria

A generated draft for the target lane is considered acceptable only if all of the following are true:

1. The article opens with a concrete project problem, friction point, or failure mode.
2. The article uses stage-based Chinese headings instead of English internal headings.
3. The body reads like a narrative retrospective rather than a material dump.
4. The output does not include internal fields such as:
   - `Reader:`
   - `Core question:`
   - `Evidence anchors:`
   - `Revision instruction`
   - `Style cues applied`
5. The article contains at least one clear human judgement call, not only factual sequence.
6. The result is short enough to resemble a first public WeChat article rather than a long technical memo.

## Design Overview

The pipeline will remain:

`materials -> bedrock -> outline -> draft -> rewrite`

But each stage will become more article-oriented for the chosen lane.

### Summary of Changes

- `bedrock` becomes a structured retrospective skeleton instead of raw source summaries
- `outline` becomes a Chinese phase-based public-article outline
- `draft` writes article paragraphs directly, not exposed intermediate metadata
- `rewrite` becomes constrained article rewriting, not content appending

## Bedrock Design

### Current Problem

The current `bedrock` is built from title snippets and source truncation. That is enough for proof-of-flow, but it is not enough to support a readable retrospective article.

### New Bedrock Shape

Keep the persisted type the same for now to avoid a broad domain migration, but change how the fields are populated for the target lane.

For `build-retrospective`, the `bedrock` content should semantically represent these six slots:

1. `openingProblem`
   - the real friction, contradiction, or failure mode that should open the article

2. `projectGoal`
   - what the project was initially trying to achieve

3. `phaseHighlights[]`
   - up to four phases
   - each phase should capture:
     - what changed
     - why it mattered

4. `turningPoints[]`
   - actual pivots such as:
     - moving from fake demo to real chain
     - moving from inline execution to offline tasks

5. `judgementCalls[]`
   - decisions that required human judgement
   - for example:
     - falling back from browser direct upload to backend proxy upload
     - splitting batch execution into worker-based offline processing

6. `closingTakeaway`
   - the final point the article should land on

### Mapping onto Existing Fields

To keep the current shared contract stable:

- `theme`
  - stays as task title
- `coreQuestion`
  - becomes the distilled opening problem or retrospective core tension
- `arguments[]`
  - becomes ordered retrospective beats:
    - project goal
    - phase changes
    - judgement calls
    - closing takeaway
- `evidence[]`
  - remains reference strings
- `uncertainties[]`
  - becomes editorial gaps only when relevant

This preserves compatibility while improving the semantic value of the object.

## Material Extraction Rules

The generator should stop treating every material as equally important.

### Priority by Material Type

1. `prompt`
   - extract:
     - writing objective
     - target reader
     - tone constraints
   - do not let prompt text leak directly into article body

2. `note` with timeline-style content
   - primary source for:
     - phase changes
     - turning points
     - recent evolution

3. `article`
   - primary source for:
     - validated facts
     - already-proven framing
     - concrete engineering decisions

4. `note` / `readme`
   - secondary source for:
     - project scope
     - architecture shape
     - capability boundaries

### Extraction Priority

From any source, extract in this order:

1. turning point
2. judgement call
3. concrete result
4. background

Each material should contribute at most `1-3` useful signals into the article skeleton. Repetition should be aggressively discarded.

## Outline Design

### Current Problem

The current outline is a fixed English three-section template:

- Why this matters
- How the system works
- Tradeoffs and open questions

That structure is too abstract for a public retrospective article.

### New Outline Structure

For `build-retrospective/blog`, generate a fixed Chinese phase-oriented structure:

1. `开场问题`
   - a concrete pain point or false impression that the project exposed

2. `项目起步`
   - initial goal
   - where agent was useful in the blank-page phase

3. `真实链路打通`
   - moving from demo-like behavior to real workflow
   - include concrete engineering constraints

4. `项目复杂化`
   - batch review, more materials, asynchronous state, or route splitting
   - explain why pure vibe stopped being enough

5. `工程收口`
   - deployment, worker, storage, VPC, consistency, or reliability work
   - show where human judgement became dominant

6. `最后的判断`
   - the final takeaway

### Section Rules

- all headings must be Chinese
- each section should have a single narrative job
- each section should reference at most `2-3` evidence items
- the outline should prefer turning-point evidence over evenly distributed evidence

## Draft Design

### Current Problem

The current draft generator writes internal scaffolding directly into the article body.

### New Draft Behavior

For the target lane, the draft generator should produce article prose directly.

### Opening Rule

The first paragraph must:

- start from a concrete problem, mismatch, or failure mode
- not start from task metadata
- not explain the whole project immediately

### Body Rule

Each section should contain `2-4` short paragraphs.

Each paragraph should favor this sequence:

1. what happened
2. what problem appeared
3. what judgement or adjustment followed

### Evidence Rule

Do not copy large material chunks.

Use source material only to extract:

- one concrete fact
- one decision
- one consequence

### Length Rule

For the target lane, keep the generated draft around `1200-1800` Chinese characters. If the content grows too long, drop repeated explanation before dropping turning points.

### Style Rule

The generated draft should be:

- first person
- direct
- restrained
- specific

Each major section should contain at least one concrete noun or concrete technical action, such as:

- `GitHub Pages`
- `OSS`
- `worker`
- `MySQL`
- `VPC`

## Rewrite Design

### Current Problem

The current rewrite generator does not rewrite. It appends metadata to the end of the previous version.

### New Rewrite Behavior

For the target lane, rewrite should generate a cleaner new article version based on the previous one.

Supported first-pass rewrite intents:

1. more first-person retrospective
2. shorter and more WeChat-like
3. stronger emphasis on agent usefulness and limits

### Rewrite Priorities

When rewriting:

1. improve the opening
2. tighten long explanatory sections
3. strengthen action-problem-judgement phrasing
4. sharpen the closing takeaway
5. remove internal system residue completely

### Style Profile Usage

The style profile should continue to provide constraints, but it should influence:

- opening tendency
- sentence rhythm
- explanation density

It should not be printed into the final article.

## Fallback Behavior

If a task is not `build-retrospective`, or if required materials are too weak to populate the lane-specific structure, the system may fall back to the generic generator behavior.

This fallback should remain explicit in implementation rather than hidden in mixed logic.

## Implementation Shape

The change should stay local to the generator layer and service orchestration that selects generator behavior.

Expected touch points:

- `packages/mock-server/src/generators/bedrock-generator.ts`
- `packages/mock-server/src/generators/outline-generator.ts`
- `packages/mock-server/src/generators/draft-generator.ts`
- `packages/mock-server/src/generators/rewrite-generator.ts`
- possibly small selection logic in:
  - `draft-service.ts`
  - `rewrite-service.ts`

Avoid broad repository or route changes.

## Testing Strategy

### Generator Tests

Add focused tests for the target lane:

- `bedrock-generator`
  - produces retrospective-oriented arguments
- `outline-generator`
  - produces Chinese phase headings for `build-retrospective`
- `draft-generator`
  - does not emit internal metadata labels
- `rewrite-generator`
  - produces a new article body rather than appending instructions

### Workflow Tests

Extend workflow-level tests to assert:

- final draft includes phase headings
- final draft excludes internal residue
- rewrite output excludes appended instruction sections
- generated article length is within a reasonable short-article range

### Real Regression Sample

Use the `AI Homework Review` writing task materials as a fixed regression-style sample to avoid sliding back into internal-template output.

## Risks

### Risk 1: Overfitting to one article shape

This work deliberately optimizes one lane. That is acceptable because the current problem is not generality, it is output usefulness.

### Risk 2: Weak source materials still produce shallow copy

Mitigation:

- prefer turning points and decisions over full summaries
- cap extracted signals per material

### Risk 3: Generic and specialized logic become tangled

Mitigation:

- gate behavior explicitly on `articleType` and target lane
- keep fallback path intact

## Acceptance Criteria

This design is complete when:

1. a `build-retrospective/blog` draft reads like a public retrospective article
2. the first paragraph opens from a concrete issue
3. the output uses Chinese stage headings
4. no internal intermediate labels appear in the final article body
5. rewrite produces a cleaner article version, not an appended metadata block
6. tests cover both generator behavior and workflow regression
