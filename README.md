# 🪧 Waymark

[![npm version](https://img.shields.io/npm/v/waymark-docs.svg)](https://www.npmjs.com/package/waymark-docs)

Waymark is a small, offline-first CLI that helps coding agents find the right
repository docs for each task. Add structured frontmatter to existing Markdown
or MDX files, and agents can discover only relevant paths before opening a
document without reading a large index or following linked navigation files
that load unrelated context. It is as easy to set up as file-based navigation,
but remains deterministic and token-efficient; unlike RAG or MCP-backed
retrieval, it needs no ranking, maintained index or retrieval infrastructure.

Each document has three searchable metadata dimensions:

1. **Scope:** Where does this document apply? (`backend`, `search-service`)
2. **Kind:** What role does this document serve? (`convention`, `agent-guide`, `adr`)
3. **Tags:** What topics does it cover? (`testing`, `architecture`)

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

Install the `waymark-docs` package as a development dependency:

```sh
pnpm add -D waymark-docs
yarn add -D waymark-docs
bun add -d waymark-docs
npm install --save-dev waymark-docs
```

## Quick start

1. **Create a Waymark configuration**

   Run `init` in the repository root:

   ```sh
   npx waymark init
   ```

2. **Define searchable metadata**

   Add the document scopes, kinds and tags that agents can search:

   ```yaml
   scopes:
     backend: Documentation that applies to backend services
     search-service: Documentation that applies to the search service

   kinds:
     adr: Read to understand past architectural decisions and their constraints
     convention: Read before changing code to follow required repository practices

   tags:
     architecture: System boundaries, component relationships and dependencies
     typescript: TypeScript-related documentation
   ```

3. **Register a document**

   Add Waymark metadata to a Markdown or MDX file. For example, save this as
   `docs/conventions/typescript.md`:

   ```yaml
   ---
   kind: convention
   description: TypeScript conventions for this repository
   scopes: [backend, search-service]
   tags: [typescript]
   ---
   # TypeScript conventions
   ```

4. **Validate the repository**

   Check the configuration and discovered documents:

   ```sh
   npx waymark status
   ```

   ```text
   Root: /path/to/repository
   Status: valid
   Waymark Documents: 1
   Unregistered Documents: 1
   Scopes: 2
   Kinds: 2
   Tags: 2
   ```

5. **Discover documents**

   List the available vocabulary, then run `npx waymark find` with relevant
   scope, kind and tag filters:

   ```sh
   npx waymark show
   ```

   ```sh
   npx waymark find --scopes backend --kinds convention --tags typescript
   ```

   ```text
   docs/conventions/typescript.md [backend,search-service] [convention] [typescript] — TypeScript conventions for this repository
   ```

   To have agents use Waymark continuously, add this to `AGENTS.md`,
   `CLAUDE.md` or an equivalent file:

   ```md
   ## Context Discovery

   Before working on a non-trivial task, run `npx waymark show`, then use
   `npx waymark find` with relevant comma-separated `--scopes`, `--kinds` and
   `--tags` values. Use `--query` for literal text searches and `--filter` for
   Boolean expressions over metadata when you need more detailed results.
   ```

Waymark uses `waymark.yml` by default and also recognizes `waymark.yaml`. It
looks for the configuration in the current directory and its ancestors, so
commands can also run from a nested repository directory. Use only one filename
per directory.

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
# When true, every Waymark Document must declare at least one scope.
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
