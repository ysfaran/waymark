# 🪧 Waymark

[![npm version](https://img.shields.io/npm/v/waymark-docs.svg)](https://www.npmjs.com/package/waymark-docs)

Waymark is a small, offline-first CLI that helps coding agents find the right
repository docs for each task. Add structured frontmatter to existing Markdown
or MDX files and agents can discover only relevant paths before opening a
document without reading a large index or following linked navigation files
that load unrelated context. It is as easy to set up as file-based navigation,
but remains deterministic and token-efficient. Unlike RAG or MCP-backed
retrieval, it needs no ranking, maintained index or retrieval infrastructure.

Each document has three searchable metadata dimensions:

1. **Scope:** Where does this document apply? (`backend`, `search-service`)
2. **Kind:** What role does this document serve? (`convention`, `agent-guide`, `adr`)
3. **Tags:** What topics does it cover? (`testing`, `typescript`)

![Waymark reduces the effort required to find relevant context without retrieval infrastructure.](https://raw.githubusercontent.com/ysfaran/waymark/main/docs/assets/why-waymark.svg)

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Commands](#commands)
  - [`waymark init`](#waymark-init)
  - [`waymark status`](#waymark-status)
  - [`waymark show`](#waymark-show)
  - [`waymark find`](#waymark-find)
  - [`waymark ls`](#waymark-ls)
  - [`waymark help`](#waymark-help)
- [Contributing](#contributing)

## Installation

Install the `waymark` and `waymark-setup` skills for your coding agents:

```sh
npx skills add ysfaran/waymark --skill waymark --skill waymark-setup
```

`waymark-setup` automatically detects the active package manager and installs
`waymark-docs` locally as a development dependency.

To install the CLI manually instead, run the matching command:

```sh
pnpm add -D waymark-docs
yarn add -D waymark-docs
bun add -d waymark-docs
npm install --save-dev waymark-docs
```

## Quick start

1. Install the skills in the repository you want to set up:

   ```sh
   npx skills add ysfaran/waymark --skill waymark --skill waymark-setup
   ```

2. Ask your coding agent to use `waymark-setup`. This one-time interactive
   setup installs the CLI, configures the repository, registers useful
   documents and adds an instruction to `AGENTS.md` or an equivalent file to
   use the `waymark` skill for non-trivial tasks.
3. Review the generated `waymark.yml` configuration file, then give a fresh
   agent a non-trivial task and confirm it uses Waymark to discover relevant
   context before working.

## Commands

| Command          | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `waymark init`   | Create a starter configuration                            |
| `waymark status` | Validate and summarize the repository                     |
| `waymark show`   | List declared scopes, kinds and tags                      |
| `waymark find`   | Find registered documents across the repository           |
| `waymark ls`     | Audit registered or unregistered documents in a directory |
| `waymark help`   | Show CLI or command-specific help                         |

### `waymark init`

Create a starter configuration in the current directory.

```text
Usage: waymark init [options]

Create a starter Waymark configuration

Options:
  -h, --help  display help for command
```

```sh
npx waymark init
```

The generated file explains metadata namespacing and includes declarations to
replace with your own scope, kind and tag:

```yaml
# When true, document metadata must be nested under a `waymark` frontmatter key.
require-namespace: false
# When true, every waymark document must declare at least one scope.
require-scopes: false
scopes:
  example-scope: Explain the repository area represented by this scope
kinds:
  example-kind: Explain when agents should read this kind of document
tags:
  example-tag: Explain the topic represented by this tag
```

The `scopes` map is optional, so existing configurations remain valid. Document
scopes are flat declared identifiers: they express applicability independently
of file paths and do not inherit from one another. Documents may omit `scopes`
unless `require-scopes: true` is configured.

To skip generated or vendored documentation during discovery, add `ignore`
patterns:

```yaml
# Skip generated or vendored documentation during discovery.
ignore:
  - docs/generated/**
  - vendor/**
```

Ignore patterns are relative to the repository root and support `*`, `?` and
`**` wildcards. Waymark also honors `.gitignore` automatically.

`init` never overwrites an existing configuration and does not allow a nested
configuration beneath another Waymark root.

### `waymark status`

Validate the Waymark configuration and all discovered Waymark Documents, then
print the repository root and counts for registered documents, unregistered
documents, scopes, kinds and tags. Invalid repositories produce diagnostics
and a non-zero exit code, which makes this command suitable for CI.

```text
Usage: waymark status [options]

Validate and summarize the Waymark repository

Options:
  -h, --help  display help for command
```

Validate the repository:

```sh
npx waymark status
```

### `waymark show`

List the declared scope, kind and tag vocabulary with descriptions and document
usage counts. Pass a category to show only that vocabulary. `--scopes` narrows
kind and tag counts to documents matching any selected scope and omits values
unused by that selection.

```text
Usage: waymark show [options] [category]

List declared scopes, kinds, and tags

Arguments:
  category                 list only scopes, kinds, or tags
                           (choices: "scopes", "kinds", "tags")

Options:
  --scopes <identifiers>   select documents matching any scope (comma-separated,
                           repeatable)
  -h, --help               display help for command
```

```sh
npx waymark show
npx waymark show scopes
npx waymark show kinds --scopes backend,search-service
npx waymark show tags --scopes backend
```

### `waymark find`

Find registered Waymark Documents across the repository. With no filters,
`find` returns every registered document in deterministic path order.

```text
Usage: waymark find [options]

Discover Waymark Documents

Options:
  --scopes <identifiers>            match any scope (comma-separated,
                                    repeatable)
  -k, --kinds <identifiers>         match any kind (comma-separated, repeatable)
  -t, --tags <identifiers>          match any tag (comma-separated, repeatable)
  -T, --require-tags <identifiers>  require every tag (comma-separated,
                                    repeatable)
  -f, --filter <expression>         match a boolean filter expression
  -q, --query <text>                match literal text content
                                    (case-insensitive)
  -s, --show <fields>               show only selected metadata fields
                                    (comma-separated; defaults to all)
  --json                            return a flat JSON array
  --tree                            output documents as directory tree
  -h, --help                        display help for command
```

Simple filter values use OR within an option. Different options combine with
AND. A scope filter excludes documents that declare no scope:

```sh
# Scope is backend OR search-service, kind is adr OR convention, and at least
# one tag is typescript OR architecture
npx waymark find --scopes backend,search-service --kinds adr,convention --tags typescript,architecture

# Kind is adr, and both architecture AND typescript tags are required
npx waymark find --kinds adr --require-tags architecture,typescript
```

The four simple metadata filters are repeatable. Repeating an option is
equivalent to passing a comma-separated list:

```sh
npx waymark find --kinds adr --kinds convention
```

Use `--query` for a case-insensitive literal search of document bodies. It can
be combined with either simple or boolean metadata filters:

```sh
npx waymark find --kinds convention --query "dependency injection"
```

Use `--filter` for advanced Boolean expressions over metadata with `scope:`,
`kind:`, `tag:`, `NOT`, `AND`, `OR` and parentheses:

```sh
npx waymark find --filter 'scope:backend AND (kind:adr OR kind:convention) AND tag:typescript AND NOT tag:architecture'
```

`--filter` cannot be combined with `--scopes`, `--kinds`, `--tags` or
`--require-tags`.

By default, line, JSON and tree output include scopes, kind, tags and
description in that order. Use `--show` to select a non-empty subset:

```sh
npx waymark find --kinds convention --show kind,description
```

Return structured output for scripts and agents:

```sh
npx waymark find --tags typescript --show kind,description --json
```

Or visualize matching documents by directory:

```sh
npx waymark find --kinds adr,convention --show kind --tree
```

`--json` and `--tree` are mutually exclusive. A search with no matches succeeds
and returns an empty result.

### `waymark ls`

Inventory Markdown and MDX registration within a directory. By default, `ls`
inspects only the current directory and lists registered Waymark Documents.
Paths are returned relative to the repository root in deterministic order.

```text
Usage: waymark ls [options] [directory]

Inventory document registration in a directory

Arguments:
  directory           directory to inspect (defaults to the current directory)

Options:
  -R, --recursive     inspect directories recursively
  -u, --unregistered  list only unregistered documents
  -h, --help          display help for command
```

List registered documents directly inside `docs`:

```sh
npx waymark ls docs
```

Include all nested directories:

```sh
npx waymark ls --recursive docs
```

Find Markdown and MDX files that are missing Waymark metadata:

```sh
npx waymark ls -R --unregistered docs
```

`ls` respects `.gitignore`, Waymark ignore patterns and Git directory boundaries.
The selected directory must be inside the repository root.

### `waymark help`

Show the command list or detailed help for one command:

```sh
npx waymark --help
npx waymark help find
npx waymark find --help
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and checks.
