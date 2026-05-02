---
name: ptce-writing
description: "Use PTCE's high-level CLI entrypoint to generate technical writing from a local project, optionally with model-assisted selection and publishable editorial finishing."
---

# PTCE Writing Skill

Use this skill when the user wants to turn a local technical project into structured writing through PTCE.

## When to use it

- project retrospectives
- technical summaries
- practice shares
- design explanations

## Primary command

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at draft \
  --render json
```

## Operating rules

1. Prefer `--render json` so downstream agents can inspect structured output.
2. Default to `--stop-at draft` unless the user explicitly asks for a publishable result.
3. Use `--editorial-mode publishable --export` only when the user wants a stronger final article.
4. Prefer project directory input first; use Obsidian only as optional context or export target.
5. Explain which sources were selected and which were skipped.

## Required parameters

- `--project-path`
- `--title`
- `--article-type`
- `--reader`

## Strong defaults

- `--channel blog`
- `--stop-at draft`
- `--model-enhancement standard`

## Publishable mode

When the user wants a stronger public-facing article:

```bash
ptce write project \
  --project-path /path/to/project \
  --title "..." \
  --article-type build-retrospective \
  --reader "..." \
  --stop-at export \
  --editorial-mode publishable \
  --export \
  --obsidian-vault-path "/abs/vault" \
  --render json
```
