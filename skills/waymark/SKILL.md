---
name: waymark
description: Use the Waymark CLI to discover context and add vocabulary or documents.
---

# Discover context

Use the active package manager's local binary runner; usually `npx waymark`.

1. Run `waymark show scopes`; select relevant scopes.
2. Run `waymark show kinds --scopes <scopes>` and `waymark show tags --scopes <scopes>`, or omit `--scopes` when none apply.
3. Run `waymark find` with the selected `--scopes`, `--kinds`, and `--tags`.
4. Run `waymark find --query "<term>"` for domain nouns and specific terms from the user request, without metadata filters. Read relevant matches before working.
5. Refine or broaden noisy or incomplete results. `--query "text"` searches bodies literally and case-insensitively. Use `--filter 'scope:backend AND (kind:adr OR kind:convention)'` for Boolean metadata.

# Add vocabulary or documents

For new-document scans, start with `waymark ls --recursive --unregistered`.

1. Run `waymark status` and `waymark show`; inspect the config, target documents, and nearby registrations.
2. Reuse matching vocabulary. Add only durable distinctions:
   - **Scopes:** where a document applies; flat, plural, and stable—not individual files.
   - **Kinds:** why an agent reads a document; exactly one per document.
   - **Tags:** recurring topics; plural. Skip one-off labels.
3. Reconcile overlaps and synonyms. Declare lowercase kebab-case identifiers in the config before use; descriptions should explain selection.
4. Preserve frontmatter. Add non-empty `kind` and `description`, plus applicable `scopes` and `tags`; descriptions say when the document is useful.
5. Follow `require-namespace` and `require-scopes`. Put namespaced fields under `waymark:`; never mix flat and namespaced metadata. Omit empty optional fields unless the repository keeps them.
6. Validate with `waymark status` and a representative `waymark find`.
