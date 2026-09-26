---
name: waymark-setup
description: Set up Waymark interactively in a repository.
disable-model-invocation: true
---

# Setup

Treat invocation as authorization to complete routine setup. Inspect first, present
one concise setup plan, and get approval for its material choices. After approval,
apply the plan without edit-by-edit pauses; ask again only when inspection reveals
a new choice that would materially change it.

1. Detect the active package manager and whether [`waymark-docs`](https://www.npmjs.com/package/waymark-docs) is already a local development dependency. Inspect the repository's documentation, workspace structure, existing Waymark configuration, `.gitignore`, and `AGENTS.md`, `CLAUDE.md`, or equivalent agent instructions. If package-manager detection or the instruction-file target is ambiguous, include that choice in the setup plan.
2. Classify the repository as single-project or monorepo. Propose a small initial vocabulary grounded in the repository: scopes say where documents apply and kinds say why agents read them. For a monorepo, recommend scopes for meaningful areas and `require-scopes: true`. For a single project, keep `require-scopes: false` unless scopes materially improve selection. Defer tags until reviewing actual registration candidates; say so explicitly instead of proposing speculative tags.
3. Present one approval checkpoint covering the dependency installation, instruction-file change, configuration shape, scopes, kinds, likely ignore patterns, and intended first-pass document coverage. For the agent instruction, propose adding only:

   ```md
   ## Context Discovery

   For non-trivial tasks, use the `waymark` skill to find relevant context.
   ```

4. After approval, install the dependency if absent and use that package manager's local binary runner for every Waymark command. Add the approved agent instruction. When no configuration exists, run `waymark init` from the repository root and tailor its generated `waymark.yml`; edit an existing configuration in place. Keep `tags: {}` until candidate review establishes useful topics. Run `waymark status` and describe its result precisely: configuration validity and registered-document coverage are separate outcomes.
5. Run `waymark ls -R --unregistered .` from the repository root and inspect every candidate. If the root inventory fails, show the exact command and error, continue with one recursive inventory per document-bearing top-level directory, and inspect root-level Markdown and MDX files separately. State that this is fallback coverage rather than a successful root inventory.
6. Add ignore patterns only for generated, vendored, or irrelevant candidates. Derive tags incrementally from documents selected for registration. Group the useful candidates into the fewest coherent registration batches, present the proposed metadata and exclusions together, and get one approval for the coverage pass. Apply the approved batches without pausing between files.
7. Rerun `waymark status`, inventory any remaining Unregistered Documents, and exercise `waymark find` with the configured vocabulary. Finish with separate statements for configuration validity, registered coverage, intentional exclusions, and unresolved inventory gaps. Setup is complete only when the repository is valid and the user has accepted the achieved coverage.
