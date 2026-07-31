---
kind: adr
description: Explains why invalid metadata blocks repository-wide document discovery
tags: [architecture, waymark-metadata]
---

# Block discovery when validation fails

Waymark will validate the repository configuration and all Waymark Documents
before returning discovery results and will fail when configuration or document
metadata is invalid.
Silently skipping invalid documents could give a coding agent an incomplete
answer that appears authoritative, so complete validation takes precedence over
partial availability. Validation reports all independent errors it can find in
deterministic path-and-field order so callers can repair the repository in one
pass. The `status` command is the single explicit repository-wide validation
command: it prints a brief summary when configuration and documents are valid,
and complete diagnostics otherwise. Directory-scoped `ls` is an inventory
operation rather than a repository-wide discovery result, so it validates only
the files within its requested scope and remains usable while errors elsewhere
are repaired.
