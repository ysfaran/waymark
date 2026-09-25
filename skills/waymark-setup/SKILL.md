---
name: waymark-setup
description: Set up Waymark interactively in a repository.
disable-model-invocation: true
---

# Setup

Work one step at a time: inspect, propose, and wait for approval before each edit.

1. Detect the active package manager and install [`waymark-docs`](https://www.npmjs.com/package/waymark-docs) locally as a development dependency if absent. Run the installation yourself, use that manager's local binary runner for later Waymark commands (`npx waymark` usually works), and ask only when detection is ambiguous.
2. Inspect the repository, its documentation, workspace structure, existing Waymark configuration, and `AGENTS.md`, `CLAUDE.md`, or equivalent agent instructions. If no agent instruction file exists, ask which one to create. Propose adding only:

   ```md
   ## Context Discovery

   For non-trivial tasks, use the `waymark` skill to find relevant context.
   ```

3. Classify the repository as single-project or monorepo and propose a small vocabulary grounded in its documents. Use short, stable identifiers and token-efficient one-line descriptions that add selection signal instead of restating the identifier: scopes say where documents apply, kinds say when or why to read them, and tags say which topics they cover. For a monorepo, recommend scopes for meaningful areas and `require-scopes: true`. For a single project, prefer kinds and tags and keep `require-scopes: false`; add scopes only when they improve selection.
4. After approval, initialize or edit `waymark.yml` and run `waymark status` through the selected package manager.
5. Run `waymark ls -R --unregistered .` through the selected package manager, inspect the candidates, and suggest `ignore` patterns for generated, vendored, or irrelevant documentation. Propose registrations in small batches, apply each approved batch, and rerun status until the repository is valid and the user is satisfied with coverage.
