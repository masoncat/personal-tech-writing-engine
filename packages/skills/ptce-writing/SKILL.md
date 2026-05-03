---
name: ptce-writing
description: Single entry point for all PTCE writing. Classifies the request, delegates to a primary writing skill (public-article-writing / prd-writing / technical-doc-writing / general-writing), enforces pre-writing gates and post-writing audits, and manages PTCE task/artifact lifecycle via CLI.
---

# PTCE Writing

## Overview

PTCE Writing is the single entry point for producing any document through PTCE. It routes the user's natural-language writing request to the correct primary writing skill, enforces quality gates before and after writing, and manages task state through the PTCE CLI.

The agent owns conversation, model reasoning, skill selection, and writing. PTCE CLI owns task state, artifact persistence, and completion.

## Use When

Any writing request that should produce a tracked PTCE artifact:

- Public articles, blog posts, WeChat long-form, technical essays, project retrospectives
- PRDs, feature specs, MVP scopes, user stories, acceptance criteria
- Technical docs, architecture docs, API docs, developer guides, runbooks
- General writing: memos, emails, explanations, rewrites
- Project-based summaries: retrospectives, practice shares, design explanations generated from a local project

## Skill Routing

On every request, classify the content type, then load exactly one primary writing skill:

| Content Type | Primary Skill | Example Requests |
|---|---|---|
| `public_article` | `public-article-writing` | 写公众号文章、博客、技术随笔、项目复盘 |
| `prd` | `prd-writing` | 写 PRD、功能规格、MVP 范围、验收标准 |
| `technical_doc` | `technical-doc-writing` | 写技术设计文档、API 文档、架构说明、排障指南 |
| `general` | `general-writing` | 写邮件、备忘录、说明文、改写润色 |

Do not load multiple primary writing skills for one task.

## Main Flow: Content Type Writing

This is the primary flow for most requests.

### Phase 1: Classify and Prepare

1. Classify the request into `contentType` and `contentSubtype`.
2. Load the primary writing skill from the routing table above.
3. Ask the user only for missing essentials: audience, purpose, source boundaries, or output expectations.

### Phase 2: Pre-Writing Gates

**For `public_article` only** — complete the Pre-Writing Gate from `public-article-writing` BEFORE creating the task:

- **Gate 1: HKR check** (R mandatory for WeChat). Do not proceed if HKR fails.
- **Gate 2: Data anchoring** — list real, named data sources that will support major claims. Do not proceed with zero sources.
- **Gate 3: Angle validation** — confirm the angle is non-obvious and comes from a concrete situation.

For `prd`, `technical_doc`, and `general`, the primary skill's core questions serve as the preparation gate.

### Phase 3: Task Creation

```bash
node --import tsx packages/cli/src/index.ts content create \
  --title "<title>" \
  --type <contentType> \
  --subtype <contentSubtype> \
  --audience "<audience>" \
  --purpose "<purpose>" \
  --render json
```

Capture the returned `taskId`.

### Phase 3.5: Research and Media Tools

For public articles, decide whether the article needs research or media before drafting:

- If the article includes latest facts, company/product actions, market data, public reports, or current events, run `ptce tools research --query "<query>" --render json` and store the result as a `research_package` artifact.
- If the article needs images, run `ptce tools media plan --title "<title>" --section "<section context>" --render json` and store the result as a `media_plan` artifact.
- Do not treat Tavily snippets as strong evidence. Strong evidence requires page extraction in the research package.
- Do not use Unsplash or AI-generated images as factual evidence.
- A media plan with zero selected images is valid when candidates do not fit the article context.

### Phase 4: Write

Write the document using the primary writing skill. Core rules across all content types:

- Every quantitative claim must cite a real, named source or be explicitly marked as author judgment.
- Follow the primary skill's output pattern and quality bar.
- For public articles: apply the Khazix-derived method and Forbidden Tone Patterns table.

### Phase 5: Quality Passes (public_article + WeChat only)

- **Voice adhesion pass**: scan and repair Forbidden Tone Patterns. Verify reader-side empathy before every advice section. Replace report-like transitions with spoken turns.
- **WeChat layout pass**: apply `docs/superpowers/specs/wechat-layout-rubric.zh.md`.

### Phase 6: Post-Writing Self-Audit

**For `public_article`** — run all four audits from `public-article-writing` before storing the artifact:

- Audit 1: Source Boundary Scan
- Audit 2: Tone Scan
- Audit 3: Actionability Scan
- Audit 4: HKR Re-Check

Do not store the artifact until all four audits pass.

For other content types, run the primary skill's quality bar checks.

### Phase 7: Store and Complete

Save the document to a file, then:

```bash
node --import tsx packages/cli/src/index.ts content artifact add \
  --task-id <taskId> \
  --type <artifactType> \
  --title "<artifact title>" \
  --content-file <path> \
  --format markdown \
  --created-by agent \
  --render json
```

```bash
node --import tsx packages/cli/src/index.ts content complete \
  --task-id <taskId> \
  --render json
```

Report the task id, stored artifact id, and any review risks.

## Alternative Flow: Project Source Writing

When the user specifically wants to generate writing **from a local project directory** (retrospectives, technical summaries, practice shares), use `ptce write project`:

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at draft \
  --render json
```

Strong defaults for this flow:
- `--channel blog`
- `--stop-at draft`
- `--model-enhancement standard`

Only use `--editorial-mode publishable --export` when the user explicitly asks for a stronger final article.

After the CLI produces output, route the draft through the primary writing skill for quality refinement following Phases 4-7 above.

## Artifact Type Defaults

| Content type | Default final artifact type |
|---|---|
| `public_article` | `draft` |
| `prd` | `prd_package` |
| `technical_doc` | `technical_draft` |
| `general` | `final_text` |

## Rules

- Do not bypass the CLI to write PTCE state.
- Do not load multiple primary writing skills for one task.
- Do not use `content run` for non-`public_article` content in the current MVP.
- Do not mark the task complete until the final artifact is stored.
- For public articles: do not draft before the Pre-Writing Gate (HKR + data anchoring + angle validation) passes.
- For public articles: every major claim must have a named data source or be explicitly marked as author judgment.
- For public WeChat output: do not store the final `draft` artifact until the voice adhesion pass has been applied.
- For public WeChat output: do not store the final `draft` artifact until the WeChat layout pass has been applied.
- For public articles: do not store the final `draft` artifact until the Post-Writing Self-Audit (all four audits) passes.
- If a required primary writing skill is unavailable, treat it as a configuration gap and stop before producing the final artifact.

## Minimal Example

For "write a technical design document for this feature":

```text
contentType = technical_doc
contentSubtype = explanation
primary skill = technical-doc-writing
artifactType = technical_draft
```

Then create the task, write the markdown document, add it as `technical_draft`, and complete the task.

For "帮我写一篇这个项目的复盘文章":

```text
→ Use Project Source Flow: ptce write project --project-path . --title "..." --article-type build-retrospective
→ Then route through public-article-writing for quality refinement
```
