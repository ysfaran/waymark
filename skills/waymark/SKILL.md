---
name: waymark
description: Find task-relevant repository context with waymark CLI.
---

# Discovery

Use the active package manager's local binary runner for the commands below; `npx waymark` usually works.

1. Run `waymark show scopes` and select the scopes relevant to the task.
2. If scopes apply, run `waymark show kinds --scopes <scopes>` and `waymark show tags --scopes <scopes>`. Otherwise run both commands without `--scopes`.
3. Run `waymark find` with the selected `--scopes`, `--kinds`, and `--tags`, then read the matching documents before working.
4. Refine or broaden noisy or incomplete results. Use `--query "dependency injection"` for a literal, case-insensitive body search. For Boolean metadata, replace the simple filters with `waymark find --filter 'scope:backend AND (kind:adr OR kind:convention)'`.
