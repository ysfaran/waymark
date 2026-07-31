---
kind: research
description: Evaluates npm naming and binary publication for the Waymark CLI
tags: [cli, release]
---

# npm package naming and binary publication for the Waymark CLI

## Research question

How are public npm CLI packages commonly named when the ideal unscoped package
name is unavailable, while keeping a shorter executable name? Is this
repository's current `waymark-docs` package, `waymark` binary, build, pack, and
invocation setup a correct way to publish a Node.js CLI through npm?

- **Status:** Complete
- **Last updated:** 2026-07-31
- **Source policy:** Primary sources only: official npm documentation and
  npm-owned implementation repositories, plus first-party CLI manifests for
  naming examples.

## Verdict

Yes. This is the standard npm mechanism for publishing a Node.js CLI. The npm
package is named `waymark-docs`, while the object-form `bin` mapping exposes a
different executable name, `waymark`:

```json
{
  "name": "waymark-docs",
  "bin": {
    "waymark": "dist/cli.js"
  }
}
```

npm explicitly defines `bin` as a mapping from command names to package-local
files and links those commands when the package is installed. Its string
shortcut is only equivalent when the one command should have the package's
name. Therefore, the current object form is not merely valid; it is the form
that preserves `waymark` while the package is named `waymark-docs`
([npm `package.json`: `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin)).

The current artifact also satisfies the other core requirements: the compiled
entry point starts with `#!/usr/bin/env node`, the tarball carries it as mode
`0755`, all imported `dist/**` files and runtime metadata are present, and a
fresh local install creates `node_modules/.bin/waymark`. No manifest change is
required to make this package provide a `waymark` command.

## Current implementation audit

| Concern          | Current repository                                                                           | Assessment                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package identity | `"name": "waymark-docs"`                                                                     | Correct; package identity is independent of its commands.                                                                                                                                                                                                                              |
| Command mapping  | `"bin": { "waymark": "dist/cli.js" }`                                                        | Correct; object form is required for this package/command name difference.                                                                                                                                                                                                             |
| Node entry point | `src/cli.ts` begins with `#!/usr/bin/env node`; TypeScript preserves it in `dist/cli.js`     | Correct. npm tells package authors to put this shebang on Node `bin` files ([npm `package.json`: `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin)).                                                                                                                |
| Executable mode  | `build` runs `chmod +x dist/cli.js`; packed mode is `0755`                                   | Correct for the current Unix release environment. npm's Unix linker also makes installed bin targets executable ([npm `bin-links` implementation](https://github.com/npm/bin-links/blob/main/lib/fix-bin.js)).                                                                         |
| Packed files     | `files` allows `dist` and `CHANGELOG.md`; `prepack` supplies package-root README and license | Correct on a successful pack. npm always includes `package.json`, README, license, and declared `bin` targets, while the `dist` allowlist includes the entry point's imported modules ([npm `package.json`: `files`](https://docs.npmjs.com/cli/configuring-npm/package-json/#files)). |
| Build timing     | `prepack` copies documentation and builds                                                    | Correct for both `npm pack` and `npm publish`; npm runs `prepack` for both operations ([npm lifecycle scripts](https://docs.npmjs.com/cli/using-npm/scripts/#life-cycle-operation-order)).                                                                                             |
| Release command  | Ubuntu workflow runs `npm publish` from `cli/` after installing workspace dependencies       | Correct; this selects the publishable manifest and invokes its packing lifecycle.                                                                                                                                                                                                      |

The package does not need `main` or `exports` solely to provide a CLI. The
`bin` field is the relevant public interface. Its normal runtime dependencies
also do not need to be copied into the tarball: they remain declared under
`dependencies` and npm installs them for the consumer. The local pack reported
no bundled dependencies.

## Object and string `bin` forms

The object form gives each command an explicit name and target. It also permits
multiple commands or aliases:

```json
{
  "bin": {
    "waymark": "dist/cli.js"
  }
}
```

For a package named `waymark-docs`, this string shortcut would instead describe
a command named `waymark-docs`, so it is not equivalent to the current intent:

```json
{
  "name": "waymark-docs",
  "bin": "dist/cli.js"
}
```

npm documents the string as shorthand only for a single executable whose name
should be the package name
([npm `package.json`: string and object `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin)).

## Installation and executable behavior

For a local dependency, npm exposes declared bins through
`node_modules/.bin`, `npm exec`, and the `PATH` used by `npm run` scripts. For a
global install, the executable is placed in the configured global bin location
([npm `package.json`: installed bins](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin),
[npm folders: executables](https://docs.npmjs.com/files/folders.html#executables)).

On Unix, npm's current bin-link implementation creates a symbolic link, makes
the target executable according to the process umask, and normalizes a CRLF
hashbang line if needed
([npm `bin-links`: link implementation](https://github.com/npm/bin-links/blob/main/lib/link-bin.js),
[npm `bin-links`: executable fix](https://github.com/npm/bin-links/blob/main/lib/fix-bin.js)).
On Windows, npm creates command shims rather than depending on a Unix symlink;
its current implementation manages bare, `.cmd`, and `.ps1` shim paths
([npm `bin-links`: Windows shim implementation](https://github.com/npm/bin-links/blob/main/lib/shim-bin.js)).
The repository was validated on macOS/Unix, not empirically on Windows; the
Windows conclusion comes from npm's first-party implementation.

The shebang remains required even though npm creates the link or shim. npm
specifically instructs Node CLI authors to start each referenced file with
`#!/usr/bin/env node` so the script is launched with Node
([npm `package.json`: `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin)).

## Correct invocation forms for this name pair

After a project-local installation:

```sh
npm install --save-dev waymark-docs
npm exec -- waymark --help
npx waymark --help
```

An npm script can invoke `waymark` directly because npm adds dependency bins to
the script `PATH`
([npm lifecycle script `PATH`](https://docs.npmjs.com/cli/using-npm/scripts/#path)).

After a global installation:

```sh
npm install --global waymark-docs
waymark --help
```

For a remote one-off execution after the package is published, either name the
package and let `npx` select its sole bin, or state the package and command
separately:

```sh
npx waymark-docs --help
npx --package=waymark-docs -- waymark --help
npm exec --package=waymark-docs -- waymark --help
```

The first form works because npm selects a package's command when its `bin`
field has exactly one entry. The explicit `--package` forms are clearest when
the package and command names differ
([npm `npx`: command selection and examples](https://docs.npmjs.com/cli/commands/npx/)).

Plain `npx waymark` is appropriate when `waymark-docs` is already installed in
the project, because the local `waymark` bin exists. It is **not** the safe
remote one-off spelling: without a local command, npm interprets `waymark` as
the package to fetch, and `waymark` is a different occupied registry package.
The one-off forms above will not resolve from the public registry until
`waymark-docs` has actually been published
([npm `npx`: local or remote packages](https://docs.npmjs.com/cli/commands/npx/)).

## Pack and publish lifecycle

npm runs these relevant lifecycle stages in order:

| Operation     | Relevant order                                                               |
| ------------- | ---------------------------------------------------------------------------- |
| `npm pack`    | `prepack`, `prepare`, `postpack`                                             |
| `npm publish` | `prepublishOnly`, `prepack`, `prepare`, `postpack`, `publish`, `postpublish` |

Thus the current `prepack` build is exercised by the CI dry-run and by the real
release. `postpack` runs after the tarball has been generated; `npm publish`
does not retain that tarball in the working directory
([npm lifecycle operation order](https://docs.npmjs.com/cli/using-npm/scripts/#life-cycle-operation-order)).
`npm pack --dry-run` is the official way to preview the files that publishing
will include
([npm publish](https://docs.npmjs.com/cli/publish/)).

The current `prepack` temporarily copies the repository README, changelog, and
license into `cli/`, then `postpack` removes them. This produces the desired
artifact, but it is a fragile working-tree transaction: during this research,
an induced pack failure after `prepack` left all three copies behind because
`postpack` was never reached. This is a repository observation consistent with
the documented lifecycle order, not an npm guarantee about every failure mode.

## Clean-room validation performed on 2026-07-31

The following are local repository observations:

1. `npm pack --dry-run --json` ran `prepack` and `postpack` and reported the
   intended file list.
2. A real tarball contained `package.json`, `README.md`, `LICENSE`,
   `CHANGELOG.md`, and all required `dist/**` files. `dist/cli.js` began with
   the Node shebang and had tar mode `0755`.
3. Installing that tarball into a new temporary npm project created
   `node_modules/.bin/waymark -> ../waymark-docs/dist/cli.js`.
4. In that fresh project, `npm exec --offline -- waymark --help` printed
   `Usage: waymark`; the same command with `--version` returned `0.1.0`.
5. The locally installed package also returned `0.1.0` through
   `npx --offline waymark --version`, `npx --offline waymark-docs --version`,
   and `npm exec --offline --package=waymark-docs -- waymark --version`.

This validates the packed artifact and local npm wiring independently of the
monorepo's existing `node_modules`. It does not validate an actual registry
download or native Windows shims because the package is not live yet.

## Current risks and recommendations

None of these findings invalidates the `bin` design, but two packaging scripts
are worth improving before treating every developer platform as a supported
release environment:

1. `build`, `prepack`, and `postpack` use the Unix commands `rm`, `chmod`, and
   `cp`. They work in the Ubuntu release workflow, but native Windows shells do
   not provide a portable guarantee for them. Replace these operations with a
   small Node build script if local Windows build/pack support is required.
2. Copying into `cli/` and relying on `postpack` cleanup can leave generated
   files after a failed pack and would overwrite/remove future package-local
   files with the same names. Prefer a staging directory or committed
   package-local documentation; otherwise make cleanup failure-safe.

As release hardening, add a real-tarball clean-room smoke test after
`npm pack --dry-run`: install the tarball in a temporary npm project and run
`npm exec -- waymark --version` and `--help`. A Windows CI leg would validate
the generated `.cmd`/`.ps1` shims rather than relying only on npm's documented
implementation. These are recommendations, not blockers for the current
Ubuntu-based first publish.

## Naming recommendation

The package name and executable do not need to match. Keep the executable as
`waymark` through:

```json
{
  "bin": {
    "waymark": "dist/cli.js"
  }
}
```

If the project keeps the Waymark product name, prefer **`waymark-docs`** over
`waymark-cli`. It is still short, describes what this particular Waymark does,
and distinguishes it from the several other agent-oriented Waymark projects
already in the registry.

`waymark-cli` is a normal and defensible CLI package name, but it is not the best
choice in this registry context: another active package, `@way_marks/cli`,
already calls itself Waymark and installs a `waymark` executable. The broader
Waymark search space also contains `agent-waymark` and `waymark-hub`, both
focused on AI-agent workflows. A generic `waymark-cli` would make authorship and
purpose less clear.

If `waymark-docs` cannot be published or a unique identity matters more than an
unscoped install name, the safest conventional fallback is
**`@<scope-you-control>/waymark`**, still exposing the `waymark` binary. npm
explicitly presents scopes as namespaces that avoid name disputes and signal
official packages for their owner. The unavailable `@waymark` scope does not
prevent using a user or organization scope the maintainer actually controls
([npm scopes](https://docs.npmjs.com/about-scopes/),
[npm organization scopes and packages](https://docs.npmjs.com/about-organization-scopes-and-packages/)).

## Concise findings

### Package name and command name are separate

npm's `bin` field maps an executable name to a file. For a locally installed
dependency, npm links that executable so it is available through `npm exec` and
inside `npm run` scripts. Therefore, installing `waymark-docs` can still provide
the command `waymark`; there is no technical requirement to rename the command
to `waymark-docs`.

Established first-party CLIs use both common fallback patterns:

| npm package                                                                                           | Installed executable | Pattern                    |
| ----------------------------------------------------------------------------------------------------- | -------------------- | -------------------------- |
| [`netlify-cli`](https://github.com/netlify/cli/blob/main/package.json)                                | `netlify`, `ntl`     | `-cli` package suffix      |
| [`remark-cli`](https://github.com/remarkjs/remark/blob/main/packages/remark-cli/package.json)         | `remark`             | `-cli` package suffix      |
| [`firebase-tools`](https://github.com/firebase/firebase-tools/blob/main/package.json)                 | `firebase`           | descriptive package suffix |
| [`@biomejs/biome`](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/package.json) | `biome`              | owner scope                |
| [`@angular/cli`](https://github.com/angular/angular-cli/blob/main/packages/angular/cli/package.json)  | `ng`                 | owner scope plus `cli`     |

This supports three conventional choices when the ideal name is occupied:

1. add `-cli`;
2. add a short, descriptive qualifier such as `-tools` or `-docs`;
3. publish under a scope the maintainer controls.

### npm favors distinct, descriptive names

npm's current naming guidance says a package name should be unique and
descriptive. For an unscoped package, it should not resemble another package or
confuse users about authorship. Scopes exist specifically to provide an
owner-controlled namespace, allow otherwise conflicting names, and signal an
organization's official packages
([npm package-name guidelines](https://docs.npmjs.com/package-name-guidelines/),
[npm scopes](https://docs.npmjs.com/about-scopes/)).

Package names are first-come, first-served. A deprecated package does not become
available merely because its maintainer recommends a replacement. npm also
detects and may block names that look like typosquats, so a registry `E404` is a
time-stamped observation that no public package is visible—not a guarantee that
a future publish will be accepted
([npm package-name disputes](https://docs.npmjs.com/policies/disputes/),
[npm typosquatting mitigation](https://docs.npmjs.com/threats-and-mitigations/#by-typosquatting--dependency-confusion),
[npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)).

## Current registry context

The following results were checked with `npm view` against the public npm
registry on 2026-07-30.

### Existing packages

| Name                                                                           | Current registry fact                                                                                | Relevance                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`waymark`](https://registry.npmjs.org/waymark)                                | Owned by another maintainer at `0.6.2`; deprecated in favor of `@typeroute/router`                   | Occupied despite deprecation                       |
| [`@way_marks/cli`](https://www.npmjs.com/package/%40way_marks/cli)             | Active at `5.1.0`; describes an AI-agent control tool and exposes `waymark` and `way_marks` binaries | Direct product and executable collision            |
| [`agent-waymark`](https://www.npmjs.com/package/agent-waymark)                 | Active at `0.4.3`; shared working state for agent orchestration                                      | Same brand area and agent audience                 |
| [`waymark-hub`](https://www.npmjs.com/package/waymark-hub)                     | Active at `1.0.0`; context and coordination hub for AI agents                                        | Same brand area and agent audience                 |
| [`@waymark/waymark-sdk`](https://www.npmjs.com/package/%40waymark/waymark-sdk) | Active Waymark JavaScript SDK                                                                        | Confirms the `@waymark` namespace is in active use |
| [`@speechify/waymark`](https://www.npmjs.com/package/%40speechify/waymark)     | Active scoped package                                                                                | Further unrelated use of the name                  |

The direct collision with `@way_marks/cli` matters more than whether
`waymark-cli` currently returns `E404`. Under npm's own guidance, an unscoped
name should not confuse users about authorship. This is an inference from the
registry results and npm's naming guidance, not a claim that npm will reject the
name.

### Candidate comparison

Every candidate marked “no public package” returned registry `E404` during the
check. Availability can change at any time.

| Candidate                                                           | Registry result   | Assessment                                                                                               |
| ------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| [`waymark-docs`](https://registry.npmjs.org/waymark-docs)           | No public package | **Recommended if keeping Waymark.** Describes repository-document discovery and differentiates this tool |
| [`waymark-cli`](https://registry.npmjs.org/waymark-cli)             | No public package | Conventional and clear, but too easy to confuse with the active `@way_marks/cli`                         |
| [`waymark-docs-cli`](https://registry.npmjs.org/waymark-docs-cli)   | No public package | Very explicit, but unnecessarily long                                                                    |
| [`waymark-discovery`](https://registry.npmjs.org/waymark-discovery) | No public package | Distinctive but less natural to install or say                                                           |
| [`waymark-tool`](https://registry.npmjs.org/waymark-tool)           | No public package | Clear enough, but “tool” says little about its purpose                                                   |
| [`use-waymark`](https://registry.npmjs.org/use-waymark)             | No public package | Sounds like a library integration rather than a repository CLI                                           |
| [`get-waymark`](https://registry.npmjs.org/get-waymark)             | No public package | Sounds like an installer or fetcher                                                                      |
| [`waymarkjs`](https://registry.npmjs.org/waymarkjs)                 | No public package | Suggests a JavaScript library and adds no useful product distinction                                     |
| [`waymark-md`](https://registry.npmjs.org/waymark-md)               | No public package | Short, but implies the product is about Markdown syntax rather than document discovery                   |
| [`waymark-ai`](https://registry.npmjs.org/waymark-ai)               | No public package | Broad, trend-dependent, and still close to other agent-oriented Waymark packages                         |

## Practical conclusion

The normal npm practice is not to distort the executable merely because the
package identifier is occupied. Choose a package identifier that is clear in
`package.json`, then retain the product command through `bin`.

For this project:

```text
package: waymark-docs
binary:  waymark
```

This yields a local development dependency such as `pnpm add -D waymark-docs`;
after that installation, commands remain `pnpm exec waymark ...` or
`npx waymark ...`. For a remote one-off invocation, use `npx waymark-docs ...`
or explicitly pair the package and command with
`npx --package=waymark-docs -- waymark ...`.

The more important strategic question is whether to keep the Waymark product
name at all. The public registry already has multiple current AI-agent tools
using Waymark, including one with the same executable. A fully distinct product
name would remove more confusion than any package suffix can.

## Sources

- [npm package name guidelines](https://docs.npmjs.com/package-name-guidelines/)
- [npm `package.json` documentation: `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin)
- [npm `package.json` documentation: `files`](https://docs.npmjs.com/cli/configuring-npm/package-json/#files)
- [npm lifecycle scripts and operation order](https://docs.npmjs.com/cli/using-npm/scripts/)
- [npm executable installation folders](https://docs.npmjs.com/files/folders.html#executables)
- [npm `npx` / `npm exec` command selection](https://docs.npmjs.com/cli/commands/npx/)
- [npm `pack`](https://docs.npmjs.com/cli/pack/)
- [npm `publish`](https://docs.npmjs.com/cli/publish/)
- [npm-owned `bin-links` implementation](https://github.com/npm/bin-links)
- [npm documentation: about scopes](https://docs.npmjs.com/about-scopes/)
- [npm documentation: organization scopes and packages](https://docs.npmjs.com/about-organization-scopes-and-packages/)
- [npm package-name and squatting policy](https://docs.npmjs.com/policies/disputes/)
- [npm typosquatting threat and mitigation](https://docs.npmjs.com/threats-and-mitigations/#by-typosquatting--dependency-confusion)
- [npm `view` command](https://docs.npmjs.com/cli/v11/commands/npm-view/)
- [npm registry documentation](https://docs.npmjs.com/cli/v11/using-npm/registry/)
- [npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)
- [Netlify CLI first-party manifest](https://github.com/netlify/cli/blob/main/package.json)
- [Firebase CLI first-party manifest](https://github.com/firebase/firebase-tools/blob/main/package.json)
- [remark CLI first-party manifest](https://github.com/remarkjs/remark/blob/main/packages/remark-cli/package.json)
- [Biome first-party manifest](https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/package.json)
- [Angular CLI first-party manifest](https://github.com/angular/angular-cli/blob/main/packages/angular/cli/package.json)
