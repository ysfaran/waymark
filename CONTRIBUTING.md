---
kind: agent-guide
description: Read before pushing or submitting a change for merge; defines required checks and commit conventions
tags: [agents, code-quality]
---

# Contributing

## Setup

Waymark uses Node.js 24 and pnpm.

```sh
nvm install
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm build
```

Optionally, install or refresh the repository's agent skills:

```sh
pnpm skills:refresh
```

Run the CLI directly from TypeScript during development:

```sh
pnpm --filter waymark-docs dev -- --help
```

The root `README.md` is also the npm package README. The package lifecycle
copies it into `cli` while creating the npm tarball.

## Checks

Run these before submitting a change:

```sh
pnpm check
```

Use `pnpm format` to format the repository.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) so automated
releases can calculate the next version and changelog. When pull requests are
squash-merged, make the pull request title conventional too.

Examples:

```text
feat(cli): add JSON output
fix(config): report invalid YAML locations
docs: clarify filter syntax
```

See [RELEASING.md](RELEASING.md) for the release process.
