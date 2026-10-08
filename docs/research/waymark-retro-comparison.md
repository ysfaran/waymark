---
kind: research
description: Compares Matt Pocock's retro skill with waymark-retro and proposes Waymark-focused improvements
tags: [agents, waymark-documents]
---

# Waymark retro comparison

## Research question

Which useful mechanisms from Matt Pocock's `retro` skill should we incorporate
into `waymark-retro`, while keeping it focused on one task's Waymark journey?

## Status

Comparison complete. The recommended revision has been applied to
`skills/waymark-retro/SKILL.md`.

## Last updated

2026-10-08.

## Sources and boundaries

The external source is Matt Pocock's
[`retro` skill at commit `2aecca12`](https://github.com/mattpocock/skills/blob/2aecca12ea9ff047f76c8178cb64dfeafd192abe/skills/engineering/retro/SKILL.md).
Its current `main` content matched this revision when researched. Local sources
are [`waymark-retro`](../../skills/waymark-retro/SKILL.md), the
[domain model](../../CONTEXT.md), the
[deterministic discovery ADR](../adr/0001-keep-document-discovery-deterministic.md),
and [writing-for-agents](../../.agents/skills/writing-for-agents/SKILL.md).

The first two columns below summarize the source skills. The adaptation column
and proposed revision are our recommendations, rather than requirements from
Matt's skill. Every candidate must connect an observed Waymark touchpoint or
consequential absence to the task outcome; general session improvements fall
outside this review.

## Comparison and suggested changes

| Mechanism in Matt's retro                                                       | Current Waymark coverage                                                                                      | Suggested Waymark adaptation                                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read primary session evidence; default to the current session.                  | Freezes the observation window and reconstructs available conversation and tool evidence, with explicit gaps. | Preserve this stronger evidence model. When supplied, use logs or history for the reviewed task to fill gaps; distinguish original evidence recovered later from experiments performed during the retro.                 |
| Navigation pointers for slow information discovery.                             | Inspects instructions, metadata, descriptions, and content.                                                   | Name the faulty selection cue or pointer and its smallest repair: vocabulary, Document Description, discovery instruction, or reference placement. Check existing documents before proposing another.                    |
| Inspect existing checks before proposing new ones.                              | Diagnoses commands and errors, but does not explicitly inspect existing validation wiring.                    | For a demonstrated validation failure, inspect the existing Waymark validation command and relevant automation. Identify a missing invocation or broken check before suggesting a new mechanism.                         |
| Route mechanical mistakes to deterministic checks; reserve prose for judgement. | Routes proposals to repository, harness, CLI, or investigation.                                               | Add a prevention choice within that routing: use validation for enforceable metadata/configuration failures; use selection cues and guidance for task-dependent filter or reading decisions.                             |
| Reduce oversized steering instructions.                                         | Checks instructions and unrelated context.                                                                    | Keep always-loaded Waymark guidance short, with precise pointers to discovery guidance or relevant documents; preserve necessary triggers.                                                                               |
| Review expensive tool calls.                                                    | Distinguishes broad candidates, excess reading, oversized documents, and unrelated context.                   | Also inspect redundant vocabulary queries, repeated failing invocations, unnecessary round trips, and verbose output. Report observed calls, candidates, or reads; avoid invented token or timing savings.               |
| Identify instructions that do not change behaviour.                             | No explicit pruning criterion.                                                                                | Flag redundant or ineffective Waymark guidance when the journey supports that finding. A single missed instruction does not prove it is a no-op; state uncertainty and test the pointer or affordance first.             |
| Improve access to crucial information.                                          | Acknowledges unavailable command and subagent evidence.                                                       | Separate evidence missing during the task from history missing during the retro. Propose access to relevant help, validation diagnostics, or discovery output only where that would have prevented the observed failure. |
| Present candidates by severity.                                                 | Scales finding count and detail to impact and complexity.                                                     | Rank actionable findings by demonstrated task impact; explain the evidence, prevention surface, smallest fix, and how to verify it.                                                                                      |
| Keep implementation context lean; place review guidance separately.             | Prioritizes main-agent context over harmless subagent-only excess.                                            | Preserve that distinction. Put Waymark detail at the point of discovery or diagnosis instead of expanding always-loaded instructions.                                                                                    |

Matt's skill also reviews coding standards, reviewer rules, global instruction
files, and general repository guardrails. Those categories should remain outside
`waymark-retro`. A CI recommendation belongs here only when an observed Waymark
failure demonstrates why it is needed; absence of general CI alone is not a
Waymark finding. Likewise, avoid adding a mandatory reviewer stage, a global
instruction audit, or unrelated third-party service access.

## Recommendation

Keep the existing five-step structure and its read-only, task-bound contract.
Strengthen steps 1, 3, 4, and 5 with evidence recovery, explicit tool economy,
existing-check-first prevention, instruction pruning, and impact ordering.
Retain full journey reconstruction in step 2. A category checklist should help
diagnosis, not force a finding in every category.

Keep the current frontmatter and `agents/openai.yaml`: the skill remains
explicitly invoked and produces proposals. It does not acquire permission to
edit files or create issues. Do not require another skill merely to run a retro;
use the writing guidance when authoring an approved instruction change.

## Implemented revision

The updated [skill body](../../skills/waymark-retro/SKILL.md) is the source of
truth for the implementation. Its existing frontmatter and invocation policy
are preserved.

## Behaviour scenarios for future evaluation

Use these task histories to evaluate the revised skill in future sessions:

- A clean discovery journey produces no fabricated finding or general audit.
- A broad candidate list that the agent screens without excess reading is not
  reported as unnecessary loaded context.
- Invalid metadata with an existing but unused validation command leads to a
  proposal to invoke or wire that check, rather than duplicate prose or tooling.
- Correct retrieval followed by a poor task-dependent reading choice leads to
  a guidance or selection-cue proposal, rather than an invented validation rule.
- Unrelated code or test failures remain outside the retro even when severe.
- Missing original output remains an uncertainty; a successful retro-time query
  does not establish what the original query returned.
- Proposed fixes name their destination and verification without editing files,
  creating issues, or expanding access during the retro itself.

These are suggested behavioural scenarios, not tests already executed.
