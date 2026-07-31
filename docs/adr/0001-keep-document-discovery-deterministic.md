---
kind: adr
description: Explains why Waymark document discovery is deterministic and agent-directed
tags: [architecture, waymark-documents]
---

# Keep document discovery deterministic

Waymark will execute explicit document-selection criteria chosen by a coding
agent and will not contain an LLM or other AI-based inference. This keeps
discovery predictable, explainable, offline, and token-efficient; interpreting
the task and choosing appropriate criteria remain responsibilities of the
calling agent. Waymark will not derive selection criteria from task
descriptions, file paths, or diffs; the agent must translate its context into
Document Kind and Document Tag filters and an optional Content Query. Matching
documents are ordered only by repository-relative path using
locale-independent ordering; Waymark does not rank presumed relevance.
