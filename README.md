# 🪧 Waymark

Find the right repository docs for your coding agent.

Waymark is a small, offline-first CLI built for AI agents. Add structured
frontmatter to Markdown or MDX files, then let the agent select the kinds and
tags relevant to its task. Waymark returns deterministic matches without
ranking results or maintaining an index.

This makes documentation discovery token-efficient: agents spend less time
searching unrelated files and more time working with the context they need.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Commands](#commands)
  - [`waymark init`](#waymark-init)
  - [`waymark status`](#waymark-status)
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

1. Create a Waymark configuration in the repository root:

   ```sh
   npx waymark init
   ```

2. Define the document kinds and tags that agents can search:

   ```yaml
   # When true, document metadata must be nested under a `waymark` frontmatter key.
   require-namespace: false

   # Skip generated or vendored documentation during discovery.
   ignore:
     - docs/generated/**
     - vendor/**

   kinds:
     adr: Read to understand past architectural decisions and their constraints
     convention: Read before changing code to follow required repository practices

   tags:
     architecture: System boundaries, component relationships, and dependencies
     typescript: TypeScript-related documentation
   ```

   Ignore patterns are relative to the repository root and support `*`, `?`,
   and `**` wildcards. Waymark also honors `.gitignore` automatically.

3. Register a Markdown or MDX file by adding Waymark metadata. For example,
   save this as `docs/conventions/typescript.md`:

   ```yaml
   ---
   kind: convention
   description: TypeScript conventions for this repository
   tags: [typescript]
   ---
   # TypeScript conventions
   ```

4. Validate the repository:

   ```sh
   npx waymark status
   ```

   ```text
   Root: /path/to/repository
   Status: valid
   Waymark Documents: 1
   Unregistered Documents: 1
   Kinds: 2
   Tags: 2
   ```

5. Discover the document:

   ```sh
   npx waymark find --kinds convention --tags typescript --show description
   ```

   ```text
   docs/conventions/typescript.md — TypeScript conventions for this repository
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
| `waymark find`   | Find registered documents across the repository           |
| `waymark ls`     | Audit registered or unregistered documents in a directory |
| `waymark help`   | Show CLI or command-specific help                         |

### `waymark init`

Create a starter configuration in the current directory.

```text
Usage: waymark init [options]

Options:
  -h, --help  Display help for the command
```

```sh
npx waymark init
```

The generated file explains metadata namespacing and includes declarations to
replace with your own kind and tag:

```yaml
# When true, document metadata must be nested under a `waymark` frontmatter key.
require-namespace: false
kinds:
  example-kind: Explain when agents should read this kind of document
tags:
  example-tag: Explain the topic represented by this tag
```

`init` never overwrites an existing configuration and does not allow a nested
configuration beneath another Waymark root.

### `waymark status`

Validate the Waymark configuration and all discovered Waymark Documents, then
print the repository root and counts for registered documents, unregistered
documents, kinds, and tags. Invalid repositories produce diagnostics and a
non-zero exit code, which makes this command suitable for CI.

```text
Usage: waymark status [options]

Options:
  -s, --show <fields>  Show declared kind and tag details (kind,tags)
  -h, --help           Display help for the command
```

Validate the repository:

```sh
npx waymark status
```

List every declared kind and tag with its description and usage count:

```sh
npx waymark status --show kind,tags
```

Show only kind details:

```sh
npx waymark status --show kind
```

### `waymark find`

Find registered Waymark Documents across the repository. With no filters,
`find` returns every registered document in deterministic path order.

```text
Usage: waymark find [options]

Options:
  -k, --kinds <identifiers>         Match any kind (comma-separated, repeatable)
  -t, --tags <identifiers>          Match any tag (comma-separated, repeatable)
  -r, --require-tags <identifiers>  Require every tag (comma-separated, repeatable)
  -f, --filter <expression>         Match a Boolean metadata filter
  -q, --query <text>                Match a literal content query
  -s, --show <fields>               Show kind, tags, and description
  --json                            Return a flat JSON array
  --tree                            Return a directory tree
  -h, --help                        Display help for the command
```

Simple filter values use OR within an option. Different options combine with
AND:

```sh
# Kind is adr OR convention, and at least one tag is typescript OR architecture
npx waymark find --kinds adr,convention --tags typescript,architecture

# Kind is adr, and both architecture AND typescript tags are required
npx waymark find --kinds adr --require-tags architecture,typescript
```

The three simple metadata filters are repeatable. Repeating an option is
equivalent to passing a comma-separated list:

```sh
npx waymark find --kinds adr --kinds convention
```

Use `--query` for a case-insensitive literal search of document bodies. It can
be combined with either simple or Boolean metadata filters:

```sh
npx waymark find --kinds convention --query "dependency injection"
```

Use `--filter` for advanced metadata expressions with `kind:`, `tag:`, `NOT`,
`AND`, `OR`, and parentheses:

```sh
npx waymark find --filter '(kind:adr OR kind:convention) AND tag:typescript AND NOT tag:architecture'
```

`--filter` cannot be combined with `--kinds`, `--tags`, or `--require-tags`.

Add metadata fields to the default line-oriented output with `--show`:

```sh
npx waymark find --kinds convention --show kind,tags,description
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

Arguments:
  directory           Directory to inspect (defaults to the current directory)

Options:
  -R, --recursive     Inspect directories recursively
  -u, --unregistered  List only unregistered documents
  -h, --help          Display help for the command
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

`ls` respects `.gitignore`, Waymark ignore patterns, and Git directory boundaries.
The selected directory must be inside the repository root.

### `waymark help`

Show the command list or detailed help for one command:

```text
Usage: waymark help [command]
```

```sh
npx waymark --help
npx waymark help find
npx waymark find --help
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and checks.
