---
name: waymark-retro
description: Review one completed task's Waymark journey and propose evidence-backed improvements.
disable-model-invocation: true
---

# Waymark retro

Review Waymark's contribution to the current task. This is a task-bound,
read-only diagnostic; finding no actionable problem is a valid result.
Include a candidate only when evidence connects it to this task's Waymark
journey and outcome.

1. Freeze the observation window at invocation. Treat earlier conversation and
   tool output as the original journey. Use available logs or history for that
   task to fill gaps; distinguish recovered original evidence from retro-time
   experiments. State gaps caused by compaction, handoff, unavailable subagent
   history, or missing command output. This step is complete when every claim can
   be qualified as observed, inferred, or unknown.
2. Reconstruct every available Waymark touchpoint: the instructions that shaped
   discovery, whether discovery happened when warranted, commands and errors,
   chosen filters and refinements, returned candidates, documents opened, user
   corrections, and effects on the task. Include visible subagent evidence, but
   prioritize context loaded into the main agent; subagent-only excess matters
   when it harmed the result or flowed back into the main context. This step is
   complete when every visible touchpoint and consequential absence is accounted
   for.
3. Test plausible causes with read-only commands and repository inspection.
   Compare the original journey with representative queries that would have
   worked better. Distinguish broad candidate results, unnecessary document
   reads, oversized documents, and unrelated context. Check selection cues and
   navigation pointers, scopes, kinds, tags, descriptions, content, instructions,
   CLI affordances, and diagnostics. Inspect redundant queries, repeated failed
   calls, avoidable round trips, and verbose output. Separate information missing
   during the task from evidence missing during the retro; ground costs in
   observed calls, results, or reads. This step is complete when each material
   problem has an evidence-backed root cause or is explicitly left unresolved.
4. Trace agent difficulty to the system surface that could have prevented it:
   repository metadata or documents, agent instructions or harness behavior, or
   the Waymark CLI. Attribute fault to agent behavior only when adequate guidance
   and affordances were available. For enforceable configuration or metadata
   failures, inspect existing Waymark validation and relevant automation first;
   prefer repairing or wiring a check over adding prose. Use guidance and
   selection cues for task-dependent discovery choices. Check existing documents
   before proposing new ones; consider pruning redundant or ineffective Waymark
   instructions when supported by evidence. Route each proposal to the local
   repository, the harness, an upstream `ysfaran/waymark` issue, or further
   investigation. Reserve upstream issues for reproducible product defects or
   limitations. This step is complete when each proposal names its prevention
   surface and the smallest supported change.
5. Return a compact **Waymark Retro**, ordering findings by demonstrated task
   impact. For each, explain the problem, evidence and uncertainty, proposed fix
   and destination, and a representative query or observable outcome that would
   verify the fix. Let impact and complexity determine the number and depth of
   findings. When nothing actionable went wrong, say so plainly. Offer relevant
   follow-up work, and apply changes or create issues only after the user
   explicitly opts in.
