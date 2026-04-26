# Write Project Skill Design

## Background

The current system already has a stable low-level writing workflow:

`task -> material -> bedrock -> outline -> draft -> rewrite -> export`

It also already has:

- a CLI command surface for each workflow step
- a mock server that persists task state and artifacts
- Obsidian export support
- a specialized `build-retrospective/blog` lane with improved draft and rewrite behavior

This is enough to prove the workflow can run, but it is not yet the right user-facing interface for real writing work.

Right now, a caller still has to:

1. understand the task model
2. manually collect project materials
3. choose which materials matter
4. create the task
5. add materials one by one
6. run each workflow step separately
7. decide whether the generated draft needs further editorial work

That is too low-level for a reusable skill-oriented writing entrypoint.

The next step is to add a higher-level, parameter-driven writing command that:

- starts from a local project directory
- extracts high-value materials
- uses model assistance at the highest-value decision points
- reuses the current workflow for state, persistence, and export
- defaults to producing a strong `draft`
- can optionally continue into a publishable editorial pass

This command is intended to become the primary execution target for a writing skill.

## Goal

Add a new high-level CLI entrypoint for project-based technical writing:

`ptce write project`

The command should:

1. accept a local project path plus explicit writing parameters
2. scan the project for candidate materials
3. optionally use model assistance to select and normalize materials
4. create and populate a PTCE writing task
5. run the current workflow through `bedrock`, `outline`, and `draft`
6. optionally continue into editorial finalization and export
7. produce a structured machine-readable result suitable for a skill or agent caller

## User Strategy

This design explicitly prioritizes:

`readability > truthfulness > looking like raw system output`

That means:

- the workflow should remain auditable and stateful
- model involvement should increase writing usefulness, not hide the system
- the final article may be more editorial than the raw workflow draft

The command is not a one-shot “publish magic” feature. It is a high-quality writing starter that can optionally continue into a publishable editing pass.

## Non-Goals

This design does **not** aim to:

- replace the existing low-level CLI commands
- redesign the server-side workflow model
- add interactive CLI prompts or a wizard
- create a new server-side top-level workflow resource
- support every writing scenario in the first pass
- guarantee publish-ready output from generator steps alone
- bind the system to one concrete external model provider yet

## Primary Use Case

The first supported use case is:

- start from a local project directory
- write a technical article based on that project
- stop by default at `draft`

Typical article types may include:

- `build-retrospective`
- `technical-summary`
- `practice-share`
- `design-explanation`

The first implementation should remain generic at the entrypoint level, while still allowing specialized downstream behavior such as the current retrospective lane.

## Chosen Approach

The chosen architecture is:

`CLI high-level entrypoint + model orchestration + existing workflow reuse`

This means:

- the new high-level command lives in the CLI package
- the current workflow server remains the source of truth for state and persistence
- model usage is added only at selected high-value reasoning points
- the writing skill will call this high-level CLI rather than replacing it

This avoids two bad extremes:

- a thin shell that only chains commands without improving material quality
- a new parallel writing system that bypasses the existing workflow

## Command Design

## Primary Command

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at draft
```

This becomes the primary high-level entrypoint for project-based writing.

## Required Parameters

- `--project-path`
- `--title`
- `--article-type`
- `--reader`

These are required because the system should not guess the basic writing task shape from weak input.

## Important Optional Parameters

- `--goal`
- `--channel`
  - default: `blog`
- `--stop-at`
  - allowed:
    - `bedrock`
    - `outline`
    - `draft`
    - `rewrite`
    - `export`
  - default: `draft`
- `--editorial-mode`
  - allowed:
    - `none`
    - `publishable`
  - default: `none`
- `--obsidian-vault-path`
- `--export`
- `--export-path`

## Material Control Parameters

- `--source-paths`
- `--with-git-log`
  - default: enabled
- `--with-obsidian-context`
  - default: disabled
- `--max-materials`

## Model Control Parameters

- `--model-enhancement`
  - allowed:
    - `off`
    - `select-only`
    - `standard`
  - default: `standard`

This makes model participation explicit and debuggable.

## Default Behavior

When called with only the required parameters, the command should:

1. scan the project directory
2. collect candidate materials from high-value default locations
3. run standard model enhancement
4. create a task
5. add selected materials
6. generate and confirm `bedrock`
7. generate and confirm `outline`
8. generate `draft`
9. stop at `draft`

No export should happen unless explicitly requested.

## Project Material Discovery

The command should not dump the whole repository into the writing workflow.

It should first build a candidate set from these default sources:

- project `README`
- `docs/`
- `docs/articles/`
- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
- recent `git log`

`--source-paths` may narrow the scan scope.

The output of this stage is a candidate material list, not workflow materials yet.

## Material Roles

Candidate materials should be classified into roles such as:

- `project-definition`
- `turning-point`
- `engineering-detail`
- `style-sample`
- `background-only`

These roles help both model selection and downstream workflow quality.

## Model Responsibility

The model should be used only where it adds clear value.

The key principle is:

`models reason; the system executes`

## Model-Driven Steps

### 1. Candidate Material Selection

Input:

- candidate materials
- file paths
- lightweight metadata
- short content excerpts when needed

Output:

- selected materials
- skipped materials
- role labels
- selection rationale

Purpose:

- prevent low-signal project noise from entering the workflow

### 2. Material Normalization

Input:

- selected material source content

Output:

- normalized summaries
- extracted facts
- decision points
- reusable phrasing signals

Purpose:

- improve workflow input quality before materials are persisted

### 3. Writing Intent Enhancement

Input:

- title
- article type
- reader
- goal
- normalized material summaries

Output:

- a stronger writing-task framing material

Purpose:

- convert sparse user parameters into a more useful task prompt

### 4. Draft Evaluation

Input:

- generated draft
- task metadata
- editorial mode

Output:

- whether the draft should stop as-is
- whether it should enter editorial finalization
- editorial instruction when needed

Purpose:

- avoid unconditional rewrite/finalization

### 5. Editorial Finalization

Only in explicit editorial mode such as:

- `--editorial-mode publishable`

Input:

- draft
- normalized summaries
- style signals

Output:

- a more publishable article version

Purpose:

- optimize for readability and publishability

## Steps That Should Remain Deterministic

These should stay in deterministic system logic:

- task creation
- material persistence
- task stage transitions
- bedrock/outline/draft/rewrite/export persistence
- path validation
- Obsidian write-back
- export rendering
- CLI parameter validation

## Internal Architecture

The first implementation should be split into four layers.

### 1. High-Level CLI Entry Layer

Responsible for:

- parsing high-level parameters
- orchestrating the end-to-end writing run
- invoking material discovery
- invoking model enhancement
- invoking existing workflow steps
- assembling the final structured result

Not responsible for:

- workflow persistence
- task state logic
- direct repository storage

### 2. Project Material Discovery Layer

Responsible for:

- scanning project paths
- loading default material sources
- extracting recent git history
- producing candidate material objects

This layer should be deterministic and testable without a model.

### 3. Model Orchestration Layer

Responsible for:

- selecting candidate materials
- normalizing selected materials
- enhancing task intent
- evaluating draft continuation
- optionally finalizing a publishable article

All outputs from this layer must be structured and explicit.

This layer must not:

- write files directly
- skip workflow state
- secretly mutate task storage

### 4. Existing Workflow Layer

The current workflow remains responsible for:

- task creation
- material storage
- bedrock generation
- outline generation
- draft generation
- rewrite generation
- export

This protects existing architecture and keeps the high-level entrypoint as orchestration, not replacement.

## Proposed Modules

The first implementation should add modules in the CLI package, not the server package.

Suggested files:

- `packages/cli/src/commands/write.ts`
  - high-level command registration
- `packages/cli/src/write/project-scanner.ts`
  - project scanning and candidate material collection
- `packages/cli/src/write/material-selector.ts`
  - model-assisted selection orchestration
- `packages/cli/src/write/material-normalizer.ts`
  - normalization into workflow-ready materials
- `packages/cli/src/write/intent-enhancer.ts`
  - stronger task framing generation
- `packages/cli/src/write/workflow-runner.ts`
  - orchestration of existing PTCE workflow calls
- `packages/cli/src/write/editorial-finalizer.ts`
  - publishable editorial pass
- `packages/cli/src/write/types.ts`
  - shared high-level command types

## Why the First Version Stays in CLI

The new behavior is primarily:

- caller orchestration
- local project interpretation
- model-assisted writing setup

It is not yet a new server-side domain resource.

Placing it in CLI first:

- minimizes workflow-layer disruption
- makes skill integration easier
- allows experimentation without changing the state model

## Output Contract

The high-level command should support the existing render modes:

- `json`
- `text`
- `markdown`

For skill and agent use, the preferred output is:

```bash
--render json
```

## Structured Result Shape

The high-level command result should include:

- `task`
- `materials`
- `bedrock`
- `outline`
- `draftVersion`
- `rewriteVersion`
- `exportRecord`
- `stopAt`
- `editorialMode`
- `selectedSources`
- `skippedSources`
- `modelActions`

### `selectedSources`

This should report which project sources were actually used.

### `skippedSources`

This should report which candidate sources were discarded.

### `modelActions`

This should report what model-assisted operations happened, such as:

- `selected_materials`
- `normalized_materials`
- `enhanced_intent`
- `evaluated_draft`
- `finalized_editorial_draft`

This is important to avoid black-box behavior.

## Skill Integration Strategy

The system should still include a writing skill, but the skill should not replace the workflow.

Its role should be:

- interpret the user’s writing request
- map it to high-level CLI parameters
- decide when model enhancement should be enabled
- call `ptce write project`
- explain the result to the caller

In other words:

- CLI is the execution system
- skill is the interpretation system

That keeps boundaries clear and makes the skill reusable for future writing scenarios.

## First-Version Scope

The first version should support:

1. one high-level entrypoint
   - `ptce write project`
2. one primary input type
   - local project directory
3. one default stop point
   - `draft`
4. two model modes
   - `off`
   - `standard`
5. one optional editorial mode
   - `publishable`

## Explicitly Out of Scope

The first version should not include:

- interactive prompts
- server-side high-level workflow resources
- arbitrary multi-source routing
- full multi-round editorial state machines
- final model-provider lock-in
- promises of universal publish-ready output

## Testing Strategy

Testing should be split into four layers.

### 1. CLI Parameter and Output Tests

Cover:

- required parameter enforcement
- enum validation for:
  - `--stop-at`
  - `--editorial-mode`
  - `--model-enhancement`
- structured JSON output shape

### 2. Project Scanning and Selection Tests

Cover:

- default source discovery
- narrowed scanning with `--source-paths`
- `--max-materials`
- stable fallback when model enhancement is disabled

### 3. Workflow Orchestration Tests

Cover:

- correct invocation flow through:
  - task
  - material
  - bedrock
  - outline
  - draft
- stop behavior for each `--stop-at`
- export behavior when enabled

### 4. End-to-End Fixture Tests

Use a fixed project fixture and assert:

- task creation succeeds
- selected materials are high-value
- `bedrock`, `outline`, and `draft` are produced
- draft does not regress to raw internal scaffolding
- publishable mode can produce a final article artifact

## Model Testing Strategy

The first version should not call a real model in automated tests.

Instead, model orchestration should depend on a provider interface with fake/test providers.

This allows tests to verify:

- model outputs are consumed correctly
- fallback behavior is stable
- orchestration remains deterministic

## Risks

### Risk 1: Too much hidden model logic

Mitigation:

- explicit `--model-enhancement`
- structured `modelActions`
- deterministic fallbacks

### Risk 2: The command becomes a second workflow system

Mitigation:

- keep persistence and state in the existing workflow
- keep orchestration in CLI only

### Risk 3: Low-signal material overload

Mitigation:

- candidate selection
- role labeling
- `--max-materials`

### Risk 4: Publishable mode becomes an uncontrolled black box

Mitigation:

- make publishable mode explicit
- keep editorial finalization as a separate layer
- report editorial model actions in output

## Acceptance Criteria

This design is complete when:

1. `ptce write project` exists as a parameter-driven high-level CLI command
2. the command can scan a local project and build candidate materials
3. the command can use model assistance to select and normalize materials
4. the command can run the existing workflow through `draft` by default
5. the command returns structured JSON suitable for skill or agent consumption
6. the system can optionally enter a publishable editorial mode
7. testing covers parameter validation, scanning, orchestration, and fixture-level behavior
8. the writing skill can cleanly call this command as its primary execution target
