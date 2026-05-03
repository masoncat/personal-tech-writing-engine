# Content Task Agentic MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP content-task model with agentic action execution: typed content tasks, profile/rubric/skill registries, server run endpoint, and CLI commands.

**Architecture:** Shared owns content types, profile/rubric/skill registries, and output package contracts. Mock server persists `ContentTask` and `OutputPackage`, exposes metadata and run APIs, and only executes the `public_article` runner in MVP. CLI adds `ptce content create` and `ptce content run` as the agent-facing command surface.

**Tech Stack:** TypeScript, Fastify, Commander, Vitest, existing file-store repository pattern.

---

### Task 1: Shared Content Model

**Files:**
- Create: `packages/shared/src/content-types.ts`
- Create: `packages/shared/src/content-profiles.ts`
- Create: `packages/shared/src/quality-rubrics.ts`
- Create: `packages/shared/src/output-package.ts`
- Modify: `packages/shared/src/domain.ts`
- Modify: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/content-model.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that assert:

```ts
expect(isValidContentSubtype('prd', 'mvp_scope')).toBe(true);
expect(isValidContentSubtype('prd', 'how_to')).toBe(false);
expect(getWorkflowProfile('public_article', 'project_retrospective').id).toBe('public_article.default');
expect(getQualityRubric('technical_doc', 'how_to').priorityOrder[0]).toBe('准');
expect(getWritingSkillBinding('prd').skillName).toBe('prd-writing');
```

Run: `npm test --workspace @ptce/shared -- content-model`
Expected: FAIL because the modules do not exist.

- [ ] **Step 2: Implement minimal shared model**

Add content type/subtype unions, valid subtype lookup, default workflow profiles, quality rubrics, writing skill bindings, `ContentTask`, `OutputPackage`, and request/response contracts.

- [ ] **Step 3: Verify shared tests**

Run: `npm test --workspace @ptce/shared -- content-model`
Expected: PASS.

### Task 2: Server Content Task API

**Files:**
- Create: `packages/mock-server/src/repository/content-task-repository.ts`
- Create: `packages/mock-server/src/repository/output-package-repository.ts`
- Create: `packages/mock-server/src/services/content-task-service.ts`
- Create: `packages/mock-server/src/routes/content-task-routes.ts`
- Create: `packages/mock-server/src/routes/content-metadata-routes.ts`
- Modify: `packages/mock-server/src/app.ts`
- Test: `packages/mock-server/tests/content-task-routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Add tests that assert:

```ts
POST /content-tasks creates a prd task with workflowProfileId, qualityRubricId, skillBindingId, and outputPackage.
GET /content-types returns public_article, prd, technical_doc, general.
POST /content-tasks/:taskId/runs returns UNSUPPORTED_CONTENT_RUNNER for prd.
POST /content-tasks/:taskId/runs returns an outputPackage with available public_article artifacts.
```

Run: `npm test --workspace @ptce/mock-server -- content-task-routes`
Expected: FAIL because the routes do not exist.

- [ ] **Step 2: Implement repositories, service, and routes**

Create content task/output package repositories using `FileStore`, build task/output package models from shared registries, register metadata routes, and implement MVP run behavior.

- [ ] **Step 3: Verify server tests**

Run: `npm test --workspace @ptce/mock-server -- content-task-routes`
Expected: PASS.

### Task 3: CLI Content Commands

**Files:**
- Create: `packages/cli/src/commands/content.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/tests/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Add tests that assert:

```ts
ptce content create --title ... --type prd --subtype mvp_scope --audience ... posts to /content-tasks.
ptce content run --task-id task-1 posts to /content-tasks/task-1/runs.
```

Run: `npm test --workspace @ptce/cli -- cli`
Expected: FAIL because the command does not exist.

- [ ] **Step 2: Implement content commands**

Register `content create` and `content run`, validate content type/subtype choices with Commander parsers, call the new API endpoints, and render responses through existing renderers.

- [ ] **Step 3: Verify CLI tests**

Run: `npm test --workspace @ptce/cli -- cli`
Expected: PASS.

### Task 4: Full Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run focused package tests**

Run:

```bash
npm test --workspace @ptce/shared -- content-model
npm test --workspace @ptce/mock-server -- content-task-routes
npm test --workspace @ptce/cli -- cli
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 3: Review final diff**

Run: `git diff --stat`
Expected: only content-task MVP files and the design/plan docs changed.
