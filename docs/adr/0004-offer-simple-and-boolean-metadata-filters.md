---
kind: adr
description: Explains the choice of simple flags and Boolean expressions for metadata filtering
tags: [architecture, cli, waymark-metadata]
---

# Offer simple and Boolean metadata filters

Waymark will provide simple accumulated `--kinds`, `--tags`, and
`--require-tags` options for common discovery and a mutually exclusive
`--filter` expression with explicit `NOT`, `AND`, `OR`, and parentheses for
arbitrary grouping. This preserves short agent commands while avoiding the
expressiveness limits of specialized flags; the two syntaxes are kept separate
so their composition is never implicit. The supporting CLI precedent is
captured in
[CLI filter syntax conventions](../research/cli-filter-syntax-conventions.md).
