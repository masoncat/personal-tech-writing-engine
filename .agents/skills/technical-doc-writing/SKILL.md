---
name: technical-doc-writing
description: Use when writing or revising technical documentation, API docs, architecture docs, developer guides, READMEs, runbooks, integration guides, or troubleshooting docs.
---

# Technical Doc Writing

## Overview

Technical documentation helps readers correctly understand, use, operate, or maintain a system. It optimizes for accuracy against source of truth, executable guidance, and maintainability.

## Use When

- The user asks for architecture docs, technical design docs, API docs, READMEs, developer guides, integration guides, runbooks, or troubleshooting docs.
- The output needs to explain how a system works, why it is designed that way, or how to use it correctly.
- Reviewers need to evaluate correctness, implementation fit, risks, and operational boundaries.

Do not use for PRDs, public essays, marketing copy, or general prose edits unless the document's main task is technical correctness.

## Classify The Doc Type

Choose the subtype before drafting:

| Subtype | Reader task |
| --- | --- |
| `tutorial` | Learn through a guided path |
| `how_to` | Complete a concrete task |
| `reference` | Look up exact specs, parameters, commands, errors |
| `explanation` | Understand architecture, concepts, reasons, tradeoffs |
| `troubleshooting` | Diagnose symptoms and fix failures |
| `quickstart` | Reach a minimal working result quickly |

## Core Questions

Answer these before drafting:

- Who is the technical reader?
- What task or review decision must the document support?
- What are the source-of-truth files, APIs, commands, configs, or specs?
- Which claims are verified, inferred, or intentionally proposed?
- What are the boundaries, failure modes, and maintenance implications?

## Output Pattern

For technical design and architecture explanation, include:

- Review guide or decision summary.
- Current vs target architecture when relevant.
- Data model and contract changes.
- Runtime flow or sequence diagram.
- CLI/API behavior.
- MVP scope and non-goals.
- Risks, edge cases, and review questions.
- Verification strategy.

## Quality Bar

Priority order:

```text
准 > 可执行 > 完整 > 清晰 > 美 > 像
```

Check before finalizing:

- Statements match source files, code, API, or clearly marked proposals.
- Commands, endpoints, and types are concrete.
- Diagrams match the described flow.
- Failure modes and unsupported paths are visible.
- The document can be maintained when code changes.

## Hard Failures

- Writing without checking available source of truth.
- Presenting guessed behavior as implemented behavior.
- Only documenting the happy path.
- Mixing user tasks, implementation details, and review decisions without structure.
- Removing necessary technical boundaries for readability.
