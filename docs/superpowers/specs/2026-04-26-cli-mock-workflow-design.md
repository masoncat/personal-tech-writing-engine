# CLI Mock Workflow Design

## Background

The current repository is effectively empty and needs a first runnable implementation that matches the approved PRD and technical design direction:

- MVP entrypoint is `Skill + CLI`
- CLI talks to an application service boundary instead of owning business state
- The first milestone is a runnable local workflow, not full AI capability depth
- Obsidian is both a primary input source and a write-back destination for knowledge loop closure

The first implementation target is therefore:

`CLI -> local mock application service -> file-backed storage -> Obsidian write-back`

This preserves the future architecture while keeping the first build small enough to run locally.

## Goal

Build a runnable end-to-end CLI and local task workflow skeleton that can complete:

`task -> material -> bedrock -> outline -> draft -> rewrite -> export`

The content-generation stages may use local rules or stubs in the first version, but the command surface, API contracts, state transitions, and persisted artifacts must already reflect the intended product architecture.

## Chosen Approach

The approved approach is:

**CLI + local mock application service + file-backed persistence**

Rejected alternatives:

- **CLI + mock server + in-memory storage**
  - Too fragile for repeatable workflow testing
  - Not a good foundation for the next development step
- **CLI direct-to-module calls**
  - Collapses CLI and application service boundaries
  - Would likely require a later rewrite

This choice optimizes for protocol stability and architecture correctness rather than the absolute minimum initial code size.

## Scope

### In Scope

- Monorepo scaffold for CLI, mock server, and shared contracts
- Runnable `ptce` CLI
- Local Fastify mock application service
- File-backed persistence under repository-controlled data storage
- End-to-end workflow for:
  - task creation
  - material ingestion
  - bedrock generation and confirmation
  - outline generation and confirmation
  - draft generation
  - rewrite generation with style extraction from historical articles
  - export generation
- Obsidian import as a primary material source
- Obsidian write-back for selected high-value outputs

### Out of Scope

- Real LLM orchestration
- PostgreSQL, pgvector, Redis, BullMQ
- Web UI
- Team collaboration
- Full image pipeline
- Automatic publication
- Rich style learning beyond local heuristic extraction

## Architecture

### System Boundary

The first implementation uses three packages:

1. `packages/cli`
   - Owns command parsing, argument validation, HTTP requests, and output formatting
   - Does not hold business state

2. `packages/mock-server`
   - Owns application service behavior
   - Enforces task stage transitions
   - Persists domain objects
   - Generates stub or rule-based outputs
   - Writes selected artifacts back to Obsidian

3. `packages/shared`
   - Owns domain enums, DTOs, error contracts, and shared schemas
   - Keeps CLI and server on one protocol definition

### Repository Layout

```text
.
├─ package.json
├─ tsconfig.base.json
├─ packages/
│  ├─ cli/
│  │  ├─ src/
│  │  │  ├─ client/
│  │  │  ├─ commands/
│  │  │  ├─ output/
│  │  │  └─ index.ts
│  ├─ mock-server/
│  │  ├─ src/
│  │  │  ├─ generators/
│  │  │  ├─ repository/
│  │  │  ├─ routes/
│  │  │  ├─ services/
│  │  │  ├─ workflow/
│  │  │  └─ index.ts
│  └─ shared/
│     └─ src/
│        ├─ contracts/
│        ├─ domain/
│        └─ utils/
└─ .ptce-data/
   ├─ exports/
   ├─ indexes/
   ├─ materials/
   ├─ tasks/
   └─ versions/
```

### Design Principles Applied

- CLI only speaks HTTP to the application service
- The mock server keeps the same shape as the future real service
- File-backed repositories are an implementation detail behind repository interfaces
- Fact structure and expression style remain separated
- Obsidian is treated as a first-class knowledge workflow boundary, not a side import path

## Domain Model

The first version keeps the domain small but aligned with the technical design.

### WritingTask

- `id`
- `title`
- `articleType`
- `reader`
- `stage`
- `createdAt`
- `updatedAt`

This is the aggregate root. Every generated object belongs to a task.

### Material

- `id`
- `taskId`
- `type`
- `title`
- `source`
- `content`
- `createdAt`
- optional source metadata:
  - `vaultPath`
  - `relativePath`
  - `frontmatter`
  - `tags`

Supported first-version material types:

- `prompt`
- `note`
- `repo`
- `article`
- `draft`
- `reference`

### InformationBedrock

- `id`
- `taskId`
- `theme`
- `coreQuestion`
- `arguments[]`
- `evidence[]`
- `uncertainties[]`
- `confirmed`

### ArticleOutline

- `id`
- `taskId`
- `title`
- `sections[]`
- `confirmed`

Each section should include a clear purpose and evidence references.

### StyleProfile

- `id`
- `taskId`
- `sourceMaterialIds[]`
- `openingTraits[]`
- `rhythmTraits[]`
- `explanationTraits[]`
- `forbiddenPatterns[]`
- `summary`

The first version does not implement advanced style learning. It derives a minimal profile from historical article materials during rewrite preparation.

### ArticleVersion

- `id`
- `taskId`
- `versionType`
- `content`
- `basedOnBedrockId`
- `basedOnOutlineId`
- `styleProfileId`
- `changeSummary`

Supported first-version version types:

- `draft`
- `rewrite`

### ExportRecord

- `id`
- `taskId`
- `versionId`
- `channel`
- `format`
- `outputPath`
- optional Obsidian metadata:
  - `vaultPath`
  - `relativePath`

## Task State Flow

The first version uses a strict forward-only state flow:

- `created`
- `collecting_materials`
- `bedrock_review`
- `outline_review`
- `draft_ready`
- `rewriting`
- `exported`

### Transition Rules

- Task creation starts at `created`
- Adding any material moves the task to `collecting_materials`
- Bedrock generation moves the task to `bedrock_review`
- Outline generation requires a confirmed bedrock and moves the task to `outline_review`
- Draft generation requires a confirmed outline and moves the task to `draft_ready`
- Rewrite requires an existing version and moves the task to `rewriting`
- Export requires an existing version and moves the task to `exported`

### Product Principle Mapping

This state machine is how the first version enforces the product priority:

- `true` is protected by requiring confirmed bedrock before outline generation
- `true` is protected again by requiring confirmed outline before draft generation
- `style` is only applied during rewrite
- `presentation` is only applied during export

This directly implements `真 > 像 > 美`.

## CLI Command Surface

The first version command surface is:

```bash
ptce task create --title "..." --article-type "source-analysis" --reader "..."
ptce task get --task-id <id>

ptce material add --task-id <id> --type prompt --content "..."
ptce material add --task-id <id> --type article --file ./samples/post.md
ptce material import-obsidian --task-id <id> --vault-path <vault> --path <note-or-folder>
ptce material list --task-id <id>

ptce bedrock generate --task-id <id>
ptce bedrock confirm --task-id <id> --bedrock-id <id>
ptce bedrock get --task-id <id>

ptce outline generate --task-id <id>
ptce outline confirm --task-id <id> --outline-id <id>
ptce outline get --task-id <id>

ptce draft generate --task-id <id>
ptce draft list --task-id <id>

ptce rewrite run --task-id <id> --version-id <id> --instruction "更像我，减少教程腔"

ptce export run --task-id <id> --version-id <id> --channel blog --format markdown
ptce export run --task-id <id> --version-id <id> --channel blog --format markdown --target obsidian --vault-path <vault> --output-path <relative-path>
```

### CLI Output Rules

- Default output is JSON
- Optional output modes:
  - `json`
  - `text`
  - `markdown`
- Every write operation returns stable IDs
- Every business response includes current `task.stage`

## API Contract

The first version server exposes:

```http
POST   /tasks
GET    /tasks/:taskId

POST   /tasks/:taskId/materials
POST   /tasks/:taskId/materials/import-obsidian
GET    /tasks/:taskId/materials

POST   /tasks/:taskId/bedrock/generate
POST   /tasks/:taskId/bedrock/:bedrockId/confirm
GET    /tasks/:taskId/bedrock/latest

POST   /tasks/:taskId/outlines/generate
POST   /tasks/:taskId/outlines/:outlineId/confirm
GET    /tasks/:taskId/outlines/latest

POST   /tasks/:taskId/drafts/generate
GET    /tasks/:taskId/versions

POST   /tasks/:taskId/rewrites
POST   /tasks/:taskId/exports
```

### Error Contract

Business errors return:

- `code`
- `message`
- `details`

Required first-version error codes:

- `TASK_NOT_FOUND`
- `INVALID_STAGE_TRANSITION`
- `BEDROCK_NOT_CONFIRMED`
- `OUTLINE_NOT_CONFIRMED`
- `MATERIAL_NOT_FOUND`
- `VERSION_NOT_FOUND`
- `INVALID_ARGUMENT`

## Mock Server Internal Design

The first version mock server is split into:

- `routes/`
  - HTTP parsing and response mapping only
- `services/`
  - business orchestration and stage updates
- `repository/`
  - file-backed persistence under `.ptce-data/`
- `generators/`
  - rule-based bedrock, outline, draft, rewrite, and export generation
- `workflow/`
  - task stage guards and cross-object validation

This keeps the mock server small but prevents route-layer business sprawl.

## Stub Generation Strategy

### Bedrock Generation

Generate a structured `InformationBedrock` from imported materials by extracting:

- probable theme
- core question
- candidate arguments
- evidence references
- uncertainties

The output must be structured data, not a single freeform paragraph.

### Outline Generation

Generate a 4-7 section outline from a confirmed bedrock.

Each section should include:

- section title
- section goal
- evidence references

### Draft Generation

Generate a Markdown draft from the confirmed outline and bedrock.

Rules:

- use section-based structure
- keep arguments tethered to bedrock
- do not invent major conclusions that are not present in the bedrock

### Rewrite Generation

Rewrite an existing version by:

- deriving a minimal `StyleProfile` from historical article materials in the same task
- applying user rewrite instruction as additional expression guidance
- preserving structure and factual boundaries

Rewrite may change:

- opening style
- sentence rhythm
- explanation tone
- banned expressions

Rewrite may not change:

- the confirmed outline structure
- the core conclusions defined by the bedrock

### Export Generation

The first version exports Markdown with light channel-specific formatting for:

- `blog`
- `wechat`

It may also write selected artifacts back into Obsidian.

## Obsidian Knowledge Loop

Obsidian is the main knowledge substrate in the first version.

### Input Role

Obsidian provides:

- notes
- historical articles
- drafts
- references

Imported content becomes normalized `Material`, while preserving path and metadata.

### Output Role

The system writes back only artifacts that help future writing work.

The first version writes back:

1. `InformationBedrock`
2. `ArticleOutline`
3. final exported article

The first version does not write back every draft or rewrite iteration by default, because that would create too much low-value noise in the vault.

### Write-Back Location

Suggested Vault structure:

```text
content-engine/
├─ bedrocks/
├─ outlines/
└─ articles/
```

### Why This Matters

This creates the intended knowledge loop:

`Obsidian materials -> PTCE workflow -> selected outputs back to Obsidian -> future tasks reuse those outputs`

That keeps user-owned Markdown files as the long-term knowledge source instead of making the CLI runtime the real system of record.

## Testing Strategy

### Shared Package

- domain enum tests
- DTO and error contract tests

### Mock Server

- repository tests for file-backed persistence
- service tests for state transitions
- generator tests for output structure
- route tests for HTTP contract and error mapping

### CLI

- command parsing tests
- request mapping tests
- output formatting tests

### End-to-End Smoke Test

At least one smoke test must cover:

`task create -> material add/import -> bedrock generate/confirm -> outline generate/confirm -> draft generate -> rewrite run -> export run`

Success criteria:

- the local server starts
- the full workflow completes
- `.ptce-data/` contains task and artifact records
- exported artifacts are produced
- invalid stage calls fail with stable error codes

## Implementation Readiness

This design is intentionally protocol-first:

- the command surface is fixed early
- the application service boundary is explicit
- the state machine encodes product priorities
- Obsidian is part of the real workflow, not a future add-on

That makes it a suitable foundation for the next step: a detailed implementation plan and then staged coding work.
