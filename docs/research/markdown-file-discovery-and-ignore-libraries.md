---
kind: research
description: Evaluates Markdown discovery and gitignore libraries against Waymark requirements
tags: [waymark-documents]
---

# Markdown file discovery and ignore libraries

## Research question

Can Waymark replace its custom repository traversal with a Node.js standard API
or an npm package that discovers Markdown and MDX files while honoring
`.gitignore`, configured ignore patterns, and the scanner's other requirements?

## Status

Complete.

## Last updated

2026-07-28.

## Requirements that affect the choice

The scanner must:

- return `.md` and `.mdx` files beneath the configuration root;
- always exclude `.git`;
- apply `.gitignore` files using their directory-relative precedence and
  negation rules;
- add configuration-root-relative ignore globs without negation;
- not follow symbolic links;
- return deterministic repository-relative paths; and
- reject nested `waymark.yaml` and `waymark.yml` files within the effective,
  non-ignored scan scope.

Ignored directories are outside Waymark's effective repository scope. Waymark
does not need to enter them to find either documents or nested configurations.

## Findings

### Node.js 24 has globbing, but not `.gitignore` support

`node:fs/promises.glob()` is stable in Node 24. It accepts multiple inclusion
patterns, an `exclude` filter or exclusion patterns, and defaults to not
following directory symlinks. It returns an async iterator, so it is sufficient
for basic Markdown/MDX discovery and Waymark's additive configured ignore
patterns.
It does not read or interpret `.gitignore` files.

Consequently, using Node's glob alone would still require Waymark to discover
nested `.gitignore` files and apply their scoped precedence and re-inclusion
rules itself. Git defines those rules as coming from the path's directory and
each parent directory, with lower-level files overriding higher-level files and
the last matching pattern deciding within a level. Node's generic exclusion
globs are not a substitute for that behavior.

Sources:

- [Node.js 24 `fsPromises.glob()`](https://nodejs.org/download/release/latest-v24.x/docs/api/fs.html#fspromisesglobpattern-options)
- [Git `gitignore` precedence and pattern rules](https://git-scm.com/docs/gitignore)

### `fast-glob` and `tinyglobby` do not own `.gitignore` semantics

Both packages can efficiently select files, accept additional ignore globs, and
disable symlink traversal. Those `ignore` options are glob filters, however;
neither package discovers and applies nested `.gitignore` files as Git does.
`tinyglobby` explicitly documents that it does not implement Globby's
`gitignore` option.

Sources:

- [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3)
- [`tinyglobby` options](https://superchupu.dev/tinyglobby/documentation)
- [`tinyglobby` migration guide](https://superchupu.dev/tinyglobby/migration)

### `globby` covers the document-discovery behavior

Globby 16.2.2 is the best fit. It is ESM, includes TypeScript declarations,
supports Node 20 and later, and builds on `fast-glob`. With `gitignore: true`,
it searches for applicable `.gitignore` files downward from the working
directory and documents correct parent/nested precedence and negation
behavior. It also accepts `fast-glob` options, including additional `ignore`
patterns and `followSymbolicLinks: false`.

For Waymark, one Globby call could own file discovery with:

- explicit patterns for `**/*.md`, `**/*.mdx`, `**/waymark.yaml`, and
  `**/waymark.yml`;
- `cwd` set to the Waymark configuration root;
- `gitignore: true`;
- `followSymbolicLinks: false`;
- `dot: true` to preserve discovery inside dot-directories;
- `.git` plus the validated configuration patterns in `ignore`;
- brace expansion and extglob disabled for the supported ignore language;
  and
- a final locale-independent sort, because deterministic ordering remains
  Waymark's responsibility.

The results can then be partitioned into candidate documents and visible nested
configurations. Because Globby prunes ignored directories, configurations
inside those directories are intentionally invisible to Waymark.

Globby already depends on `ignore` and `fast-glob` (which uses its own pattern
matching implementation). Adopting it would simplify Waymark's source and
remove the need for direct `ignore` and `picomatch` use, but it moves that
complexity into a larger higher-level dependency rather than eliminating it.

Sources:

- [Globby README and `gitignore` behavior](https://github.com/sindresorhus/globby#gitignore)
- [Globby 16.2.2 package metadata](https://github.com/sindresorhus/globby/blob/v16.2.2/package.json)
- [`fast-glob` symlink and matching options inherited by Globby](https://github.com/mrmlnc/fast-glob#options-3)

## Recommendation

Use Globby 16.2.2 if the goal is to make Waymark's application code smaller and
delegate traversal and `.gitignore` correctness to a maintained library.
One filtered Globby search can return Markdown/MDX candidates and visible
nested `waymark.yaml` and `waymark.yml` files together. Waymark only needs to
partition and sort those paths before validation.

Do not switch to Node's built-in glob merely to remove dependencies: because it
does not understand `.gitignore`, that choice retains the hardest custom code.
`fast-glob` and `tinyglobby` have the same limitation. Globby is the only
evaluated option that materially simplifies the current scanner while meeting
its Git-ignore requirements.
