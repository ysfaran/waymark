---
name: waymark-setup
description: Set up Waymark interactively in a repository.
disable-model-invocation: true
---

# Setup

Guide first-time setup from repository inventory through verified document
registration. Treat invocation as authorization for routine setup, but get one
approval for the proposed vocabulary, configuration, dependency, and agent
instruction before editing. Ask again only if later inspection reveals a materially
different choice.

1. Detect the active package manager and whether [`waymark-docs`](https://www.npmjs.com/package/waymark-docs) is a local development dependency. Inspect the workspace shape, existing Waymark configuration, `.gitignore`, and `AGENTS.md`, `CLAUDE.md`, or equivalent agent instructions.
2. Inventory every non-ignored Markdown and MDX file in the repository. Group the results by root file and documentation area, with counts, and distinguish generated, vendored, or irrelevant files. Classify the repository as single-project or monorepo and propose a small initial vocabulary grounded in the inventory. Scopes are stable repository areas; kinds are reasons agents read documents. For a monorepo, prefer meaningful area scopes and `require-scopes: true`. For a single project, keep `require-scopes: false` unless scopes materially improve selection. Defer tags until document review.
3. For a large inventory, when subagents are available, delegate read-only review by coherent documentation area or candidate scope. Have each report the files reviewed, suggested scopes, kinds, tags, exclusions, and ambiguities. Reconcile the reports yourself before presenting anything: choose the final vocabulary and remove conflicting, overlapping, or duplicate suggestions. Subagents do not edit the repository.
4. Make the first approval checkpoint a compact **Waymark setup preview** in this order:

   - Begin: `To get started with Waymark setup, I scanned all <N> Markdown and MDX documentation files.`
   - `Files found (<N>):` name root files and grouped documentation areas with counts.
   - `Repository:` give the package manager and single-project or monorepo classification.
   - `Suggested scopes (<N>):` show every identifier with a short purpose, or say why no scopes are useful.
   - `Suggested kinds (<N>):` show every identifier with a short purpose.
   - `Tags:` say they are deferred until the documents selected for registration are reviewed.
   - `Setup changes:` state whether the dependency and configuration will be added or updated, and name the files.
   - `Agent guidance:` say you will add the `waymark`-skill instruction to the chosen agent-instruction file.
   - End with one direct approval question covering those material choices.

   Keep this preview easy to scan. Show actual names and counts; avoid hidden technical details, speculative tags, and path-by-path registration proposals.

5. After approval, install the dependency if absent and use that package manager's local binary runner for every Waymark command. Add this exact block to the approved agent-instruction file:

   ```md
   ## Context Discovery

   For non-trivial tasks, use the `waymark` skill to find relevant context.
   ```

   When no configuration exists, run `waymark init` from the repository root and tailor its generated `waymark.yml`; edit an existing configuration in place. Keep `tags: {}` until candidate review establishes useful topics.

6. Run `waymark ls -R --unregistered .` from the repository root. If it fails, show the exact command and error, then inventory each document-bearing top-level directory recursively and root Markdown/MDX files separately; describe this as fallback coverage.
7. Use the `waymark` skill's **Add vocabulary or documents** workflow to apply the approved scopes and kinds, review registration candidates, derive useful tags, add document frontmatter, and validate retrieval. This skill is the single source of truth for vocabulary and frontmatter mechanics.
8. Add ignore patterns only for generated, vendored, or irrelevant candidates. Group useful candidates into the fewest coherent batches and get one coverage approval for proposed tags, document metadata, and exclusions before applying them.
9. Finish by reporting configuration validity, registered coverage, intentional exclusions, and unresolved inventory gaps separately. Setup is complete when the repository is valid and the user accepts the achieved coverage.
