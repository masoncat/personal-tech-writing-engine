---
name: public-article-writing
description: Use when writing or revising public-facing articles, blog posts, WeChat long-form posts, technical essays, project retrospectives, or publishable narrative content.
---

# Public Article Writing

## Overview

Public article writing turns material into a publishable piece that people can understand, finish, and remember. It optimizes for finished-work appeal without sacrificing truth.

## Hard Failures (READ FIRST)

These are non-negotiable. Violating any one makes the article unpublishable:

- **Inventing facts, experiences, sources, or outcomes for appeal.** No fabricated "我一个朋友", no made-up personal experiments, no fake data. If you don't have a real story, use a real reader scenario instead.
- **Writing without verifiable data anchors.** Every major factual claim must cite a real, named source (survey, report, product announcement, public dataset). "据调查" without naming the survey is a hard fail.
- **Giving advice while standing above the reader.** Any sentence pattern that translates to "你应该" (you should), "你必须" (you must), "你要" (you need to) without first acknowledging the reader's real constraints is a hard fail.
- **Publishing a polished rewrite with no original value.**
- **Using clickbait that misrepresents the content.**
- **For WeChat output, drafting before the HKR gate is satisfied.**
- **For WeChat output, giving advice before establishing reader-side empathy.**
- **For WeChat output, submitting a final draft before the voice adhesion pass.**
- **For WeChat output, submitting a final draft before the layout pass.**

## Pre-Writing Gate (MANDATORY — do not draft until all three pass)

### Gate 1: HKR Check

The article must satisfy at least two of the three. For WeChat long-form, **R is mandatory**.

- **H, Happy/Hook**: Is there enough curiosity, surprise, tension, or delight for someone to open it?
- **K, Knowledge**: Will the reader learn something concrete, useful, or newly framed?
- **R, Resonance**: Does the article enter through the reader's real situation, anxiety, ambition, or objection?

Reader resonance check:
- What does the reader already believe?
- What would make the reader resist this argument?
- Which resistance is reasonable?
- Where does the article stand beside the reader before challenging them?
- What identity shift does the article offer: who was the reader before, and who can they become after reading?

If HKR fails: do not compensate with a more polished draft. Reframe the angle before outlining. Prefer a narrower, more emotionally true premise over a broad correct premise.

### Gate 2: Data Anchoring

Before writing a single paragraph, list the real data sources you will anchor claims to:

- Every claim about "how many people do X" must cite a real survey or report (e.g., Stack Overflow Developer Survey, State of JS, GitHub Octoverse, 极光/QuestMobile for China market).
- Every claim about "X tool/company did Y" must cite a real product announcement, changelog, or official blog post.
- Claims based on the author's engineering judgment must be explicitly marked as judgment, not fact.
- If a claim cannot be anchored to a real source, either find a source, narrow the claim, or drop it.

**Output requirement: every article must end with a "来源边界" section listing all data sources used and distinguishing facts from analysis.**

### Gate 3: Angle Validation

- Is the article's core insight non-obvious? If a reader could get the same insight from reading the top 3 search results, the angle is too shallow.
- Does the angle come from a specific, concrete situation rather than a macro trend?
- Can you name exactly what changes for the reader after finishing?

## Use When

- The user asks for a public article, blog post, WeChat article, essay, project retrospective, or publishable technical narrative.
- The output needs a hook, narrative line, argument, reader payoff, and publishable finish.
- The user cares about audience response, readability, sharing, or publication quality.

Do not use for PRDs, internal execution specs, API references, runbooks, or narrow task instructions.

## Core Questions

Answer these before drafting:

- Who is the public reader?
- Why would this reader choose this article instead of the source material?
- What is the article's unique value: experience, judgment, evidence, framing, or story?
- What is the narrative line from opening to ending?
- Which claims need evidence or source boundaries?

## Forbidden Tone Patterns (Mandatory Avoidance)

These Chinese-language patterns signal that the author is standing above the reader giving instructions. Replace every occurrence before finalizing:

| Forbidden pattern | Problem | Replace with |
|---|---|---|
| 你应该/你必须/你要 | Commands the reader | 我发现/我的感受是/很多前端会 |
| 一个你明天就能做的动作 | Assigns homework | 如果你想试，可以从这里开始 |
| 你不再只是/你现在是 | Defines the reader's identity for them | 这件事意味着/这个变化是 |
| 这就是/这才是/正是 | Declares final truth | 在我看来/我的判断是 |
| 说实话/说真的 + advice | Fake candor before lecturing | Drop the prefix, keep the substance if valuable |
| 所以你到底该 | Pressures the reader to decide | 这里有三条可行的路，它们不互斥 |

Additional tone rules:
- Replace report-like transitions (因此, 此外, 综上, 值得注意的是) with spoken turns unless the article is intentionally formal.
- Every section that gives advice must first name why the ideal behavior is hard under real constraints.
- Put reader anxiety on the page before giving advice. Make the opposing concern feel reasonable, then turn.

## Khazix-Derived Public Writing Method

Borrow `khazix-writer` as a writing method, not as a persona. The useful abstraction is:

```text
specific situation
-> reader's likely feeling
-> concrete contradiction
-> author's tentative judgment
-> reader objection handled fairly
-> small action the reader can take
-> larger meaning
```

Use this method aggressively for WeChat articles, especially method, career, product, AI, and technical commentary.

Core rules:

- **Start from a scene, not a thesis.** Do not open with a macro trend if a concrete tool, workflow, screenshot, failure, or reader moment can carry the topic.
- **Stand beside the reader before giving advice.** Name why the ideal behavior is hard under real constraints.
- **Turn advice into identity movement.** The strongest career writing is not "do X"; it is "you are no longer only A, you can become B."
- **Give a low-permission first step.** If the reader needs a title, authority, budget, or team process to act, the advice is too high-level.
- **Let knowledge arrive conversationally.** Evidence and concepts should feel like they naturally explain the situation, not like a report section.
- **Use judgment without superiority.** Strong opinions should sound like "I was convinced by this" or "my current judgment is", not "smart people know".
- **Protect truth.** Do not invent first-person experiments, tool usage, or personal scenes for style.

## Output Pattern

Produce a publishable article package:

- Title or title candidates.
- Opening that creates a reason to continue (scene, not thesis).
- Main narrative or argument with data anchored to real sources.
- Evidence woven into the story rather than dumped.
- Clear ending with a sense of completion.
- A "来源边界" (source boundary) section listing all data sources and distinguishing facts from analysis.
- Optional channel notes for blog or WeChat differences.

## Reader Resonance And Voice Pass

For WeChat long-form output, resonance is not a final polish. It must appear in the appeal brief and narrative outline, then be repaired again before final layout.

Goal: keep PTCE's stronger content judgment while adopting the reusable strengths of `khazix-writer`: HKR selection, reader-side entry, concrete scene writing, oral reasoning, identity-shift framing, low-permission action, and layered self-checking. Do not copy the fixed author identity, fixed tail, or fabricated first-person experiences unless the user explicitly requests that persona.

Required behavior:

- Add short, plain, high-agreement sentences at important turns. These should be conclusions the reader can immediately feel, not slogans.
- Replace report-like transitions with spoken turns.
- Put reader anxiety on the page before giving advice. Make the opposing concern feel reasonable, then turn.
- Convert abstract advice into a concrete working scene before explaining the principle.
- Repair any sentence that makes the reader feel accused. In career/method articles, the reader should feel understood before they feel challenged.
- For every strategic recommendation, add a low-permission action that an ordinary reader can take without organizational authority.
- Keep PTCE's truth boundary: no invented personal experience, no fake tool test, no unsupported statistic.
- Reduce over-formal phrases such as `因此`, `此外`, `综上`, `值得注意的是`, unless the article is intentionally formal.
- Preserve the article's claims and evidence. Voice can change delivery, not meaning.

Voice check before finalizing:

- Does the opening make the reader want to continue within 5 paragraphs?
- Does the article pass HKR, with R clearly present?
- Are there enough standalone judgment or empathy lines that a reader can quickly agree with?
- Does every method/advice section include a concrete working scene?
- Does every major recommendation include a realistic first step?
- Does the article avoid blaming the reader for structural limits?
- Would the draft still be credible if the oral turns were removed? If not, it is relying on vibe instead of substance.

## Article Archetype Rules

Choose the dominant article shape before drafting:

- **Investigation/experiment**: the author goes into a concrete situation and reports discoveries. Needs process, surprise, and progressive reveal.
- **Product/tool experience**: the author walks the reader through a tool or workflow. Needs real interaction scenes and honest limits.
- **Phenomenon analysis**: the author notices something weird, studies why it happens, then opens a larger meaning.
- **Tool sharing**: a useful tool or prompt wrapped in a personal or practical story. Needs a clear "why this matters now."
- **Method article**: the author shares a reusable way to think or act. Needs humility, learning cost, failure modes, and actionable steps.

For career, AI, engineering, and product-method articles, default to **method article + phenomenon analysis** unless the user provides first-hand experiment material.

## WeChat Layout Pass

For WeChat long-form output, apply the repository layout rubric before finalizing:

```text
docs/superpowers/specs/wechat-layout-rubric.zh.md
```

Required behavior:

- Do not format the whole article as one sentence per paragraph.
- Use a short opening, then mix short pause paragraphs with 2-4 sentence progression paragraphs.
- Use natural bold section labels only when the article is a tutorial, technical breakdown, method article, or multi-part showcase.
- Add 3-5 `![图片]` placeholders for technical/product articles when no real images are available yet.
- Keep key judgments as standalone paragraphs, but avoid continuous standalone-line fragmentation.
- Run the hard scan in the rubric before final output.

## Post-Writing Self-Audit (MANDATORY — run before declaring the article done)

### Audit 1: Source Boundary Scan
- [ ] Every quantitative claim names a real, verifiable source (not "据调查", not "有数据显示").
- [ ] Every claim about company/product behavior cites a real announcement or changelog.
- [ ] Author judgments are explicitly marked ("我的判断是", "我观察到", "这可能意味着").
- [ ] The "来源边界" section at the end lists all sources and separates facts from analysis.
- [ ] Zero fabricated personal experiences, tool tests, or statistics.

### Audit 2: Tone Scan (run against Forbidden Tone Patterns table)
- [ ] Zero instances of "你应该"/"你必须"/"你要" as advice-givers.
- [ ] Zero instances of "一个你明天就能做的动作" as homework assignments.
- [ ] Every advice section first acknowledges the reader's real constraint.
- [ ] The article sounds like someone standing beside the reader, not lecturing from above.

### Audit 3: Actionability Scan
- [ ] Every recommended action can be taken by an ordinary reader without special authority, budget, or organizational change.
- [ ] Abstract advice is grounded in a concrete working scene.
- [ ] If the article calls for identity change, it names what the reader moves FROM and TO.

### Audit 4: HKR Re-Check
- [ ] H is still present in the final draft (not just the outline).
- [ ] K is still concrete and useful (not diluted by polishing).
- [ ] R is explicit — the reader can find themselves in the article.
- [ ] For WeChat: R is mandatory and clearly present.

## Quality Bar

Priority order:

```text
美 > 真 > 像
```

Check before finalizing:

- The topic has a real hook.
- The piece has a main line, not just sections.
- Important claims are supported or bounded — every data point names its source.
- The opening earns attention without exaggeration.
- The ending resolves the article's promise.
- Style fit does not override truth or readability.
- WeChat output has passed HKR, with reader resonance explicit.
- WeChat output has passed the voice adhesion pass without copying a persona.
- WeChat output has passed `wechat-layout-rubric.zh.md`.
- Post-writing self-audit completed with all checkboxes passed.
- "来源边界" section is present and complete.
