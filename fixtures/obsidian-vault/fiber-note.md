---
title: Fiber note
tags:
  - react
  - architecture
materialType: note
---

# Fiber scheduling

Fiber breaks rendering work into units so React can pause, resume, and prioritize updates.

## Key detail

Interruptible rendering matters when large trees would otherwise block user input.
