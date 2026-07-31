---
kind: research
description: Evaluates TypeScript linting, formatting, and type-checking alternatives
tags: [code-quality, typescript]
---

# TypeScript linting and type-checking alternatives

## Research question

Should this small Node 24/pnpm monorepo replace or change its current
ESLint, typescript-eslint, Prettier, and TypeScript type-checking setup?

## Status

Complete for public first-party sources.

## Last updated

2026-07-24.

## Scope

These are separate decisions:

- A **linter** finds suspicious source patterns. ESLint, Biome, and Oxlint
  compete here.
- A **formatter** rewrites layout. Prettier, Biome, and Oxfmt compete here.
- A **type checker** validates TypeScript programs. `tsc`/TypeScript 7 is the
  authoritative implementation; some tools can host or approximate its work.
- A **runtime/transpiler** executes or emits JavaScript. Replacing this does not
  replace type checking or TypeScript's type-system behavior.

## Repository baseline

The repository currently has:

- 45 lines of TypeScript/TSX across `apps/`, `packages/`, and `test/`.
- ESLint 9.39.2 with `@eslint/js` and typescript-eslint 8.54.0.
  `eslint.config.js` enables the two syntax-only `recommended` presets. It does
  **not** enable `recommendedTypeChecked` or `parserOptions.projectService`, so
  rules such as unhandled-Promise and unsafe-value checks have no type
  information.
- TypeScript 5.9.3. The root and three workspace projects each run
  `tsc --noEmit` separately. The configs have narrow `include` patterns and
  correctly separate Node/test, browser/bundler, and Node package environments.
- A maintained `@tsconfig/node24` base with `strict: true`, but no project
  references or build-mode graph.
- Prettier 3.9.1 as a separate formatter for TypeScript, JSON, CSS, HTML,
  Markdown, and YAML.

The present setup is simple and correct at its chosen level. Its material
weakness is confidence, not speed: linting is not type-aware. Its other gap is
that TypeScript 5.9 is two major versions behind the now-stable native
TypeScript 7.

## Findings

### Option summary

| Option                                 | Correctness and coverage                                                                                                  | Maturity and integration                                                                  | Cost here                                                                | Assessment                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Improve ESLint + typescript-eslint     | Broadest established plugin ecosystem; complete TypeScript-aware presets when using the TypeScript compiler API           | Mature flat config, editor, CI, and monorepo support                                      | Small config change on TypeScript 5/6; awkward alongside TypeScript 7    | Safest fallback, but no longer the cleanest path to TypeScript 7           |
| Biome 2.5                              | Large syntax/project ruleset; its own type inference is not the TypeScript checker and key typed rules remain less mature | Good CLI, LSP, migration, and monorepo support                                            | Low for linting; cannot replace all current formatting                   | Useful integrated tool, but not the strongest confidence-first replacement |
| Oxlint + `oxlint-tsgolint`             | Broad built-in rules; 59 of 61 typescript-eslint typed rules using TypeScript 7 semantics                                 | Oxlint is stable; type-aware linting became stable on 2026-07-22; JS plugins remain alpha | Low because this repo has one simple config and no external lint plugins | Best strategic linter fit, with a short dual-run migration                 |
| TypeScript 7 `tsc`                     | Official TypeScript checker and language behavior                                                                         | Stable since 2026-07-08; CLI, build mode, watch, and LSP are available                    | Moderate one-time 5.9 → 6 → 7 validation                                 | Recommended checker upgrade                                                |
| Project references + `tsc -b`          | Same checker, explicit package graph and incremental builds                                                               | Long-established and supported by TypeScript 7                                            | Adds composite/declaration/output decisions                              | Defer until the repository has real package edges or scale                 |
| Oxlint `--type-check` instead of `tsc` | Reuses the TypeScript 7 program used for typed linting                                                                    | Oxlint's CLI still labels compiler diagnostics experimental                               | Low script complexity, but couples checker version to `oxlint-tsgolint`  | Do not make it the sole checker yet                                        |

### Keep and improve ESLint

The current config is not getting the main correctness benefit available from
typescript-eslint. The project documents `recommendedTypeChecked` plus
`parserOptions.projectService: true` as the normal way to enable rules that use
TypeScript's type information. Project Service discovers the nearest
`tsconfig.json`, uses the same project model as editors, and supports monorepos
without one ESLint-specific tsconfig per package. Typed linting costs roughly a
type-check because TypeScript must construct the program. ([typed linting][tse-typed],
[Project Service][tse-project-service], [monorepos][tse-monorepos])

For this repository, the low-risk ESLint improvement would be:

- use `recommendedTypeChecked`, not the unstable, more opinionated
  `strictTypeChecked` preset;
- enable Project Service for `.ts`/`.tsx`;
- either disable typed rules for `eslint.config.js` or explicitly allow that
  one out-of-project file;
- keep formatting in Prettier.

The typescript-eslint project considers `recommendedTypeChecked` stable, while
`strictTypeChecked` can change outside major releases. It also deliberately
leaves formatting to Prettier or an equivalent. ([shared configs][tse-configs])

The limitation is TypeScript 7. TypeScript 7 intentionally ships without a
programmatic API until 7.1, while tools such as typescript-eslint still need the
TypeScript 6 API. The TypeScript team documents a side-by-side package/alias
setup for projects that want TypeScript 7's `tsc` and TypeScript 6-based
tooling. That works, but adds two compiler packages and version coordination to
a repository that otherwise has a very small toolchain. ([TypeScript 7
side-by-side guidance][ts7])

**Inference:** ESLint remains the best fallback if a required plugin is missing
elsewhere. It is not the simplest forward path if this repository adopts
TypeScript 7 now.

### Biome

Biome combines linting, formatting, import organization, and editor support in
one native tool. Version 2 added multi-file analysis, monorepo configuration,
and an independent type-inference engine; its current CLI/LSP can apply safe
fixes and discover nested package configuration. ([Biome v2][biome-v2],
[monorepo configuration][biome-config], [editor integration][biome-editor])

Its type-aware behavior is not a drop-in replacement for the TypeScript checker
or typescript-eslint:

- Biome's own v2 launch benchmark said its `noFloatingPromises` found about 75%
  of the cases found by typescript-eslint in the limited test set. That number
  is historical rather than a claim about 2.5, but it demonstrates that the
  engine intentionally has different coverage. ([Biome v2][biome-v2])
- In current documentation, `noFloatingPromises` remains a nursery rule, and
  recent 2.5 patch notes still mention fixes for false positives and deadlocks
  in type-aware rules. ([`noFloatingPromises`][biome-floating],
  [Biome 2.5 changes][biome-2-5])
- Biome's language-support matrix says its TypeScript support targets 5.9.
  ([language support][biome-languages])

Biome also cannot fully replace Prettier in this repository today. Markdown and
YAML parsing/formatting are still marked in progress, while this repository
formats both. Its JavaScript/TypeScript output is highly Prettier-compatible,
but intentional differences exist. ([language support][biome-languages],
[formatter differences][biome-prettier])

**Inference:** Biome is attractive when one integrated tool and broad
web-language support matter more than exact typed-rule parity. For this
confidence-first TypeScript pipeline, it should not replace `tsc`, and replacing
only ESLint would give up the main simplicity argument for choosing Biome.

### Oxlint and Oxc

Oxlint is a dedicated stable linter with built-in implementations of ESLint
core, typescript-eslint, Vitest, import, and other common plugin rules. It has
automatic fixes, nested monorepo configs, a first-party LSP/editor path, and a
flat-config migration tool. JavaScript plugin compatibility exists, but that
API is still alpha and typed JavaScript plugins are not supported.
([Oxlint overview][oxlint], [plugins][oxlint-plugins],
[nested configs][oxlint-monorepo], [editors][oxlint-editors],
[migration][oxlint-migrate])

The relevant change is very recent: on 2026-07-22 the Oxc team declared
type-aware linting stable. `oxlint-tsgolint` now implements 59 of the 61
typescript-eslint type-aware rules and is versioned against a specific
TypeScript 7 release. It shares TypeScript's native program rather than
reimplementing the type system. ([stable type-aware release][oxlint-typed-stable],
[type-aware guide][oxlint-typed])

The Oxc team's own benchmark reports tsgolint 12–18 times faster than ESLint +
typescript-eslint on four large repositories. That is first-party vendor
evidence, not a prediction for this 45-line repository; performance is
irrelevant here until the codebase grows. ([stable type-aware
release][oxlint-typed-stable])

Oxlint fits this repository unusually well:

- the current rule setup has no third-party or custom plugins;
- native Vitest and TypeScript rule families cover likely near-term needs;
- each source file already has a discoverable tsconfig;
- only one `eslint-disable-next-line` suppression needs review during migration;
- the repository can move to TypeScript 7 without retaining a TypeScript 6 API
  solely for typescript-eslint.

The caution is release age. Type-aware linting has been stable for only two
days, and the CLI still describes `--type-check` diagnostics as experimental.
The type-aware rules are suitable for a dual-run pilot; `--type-check` is not
yet a reason to remove the explicit `tsc` gate. ([Oxlint CLI][oxlint-cli])

### TypeScript and type-checking

TypeScript 7.0.2 is the current official native compiler line. The TypeScript
team says it is compatible with TypeScript 6 type checking for code that has
adopted 6.0's migration requirements, and reports roughly order-of-magnitude
compiler/editor improvements on large projects. TypeScript 7 changes defaults,
removes 6.0-deprecated options, and has no public compiler API until 7.1.
([TypeScript 7 announcement][ts7], [TypeScript 6 transition][ts6])

This repository is a good candidate for the native compiler because it uses
plain TypeScript/TSX, Node, Vitest, and a bundler-oriented browser config; it has
no Angular/Vue/Svelte language-service plugin or custom TypeScript compiler API.
The safe migration is nevertheless 5.9 → 6.0 → 7.0, because the TypeScript team
explicitly positions 6.0 as the compatibility bridge.

The migration must make ambient types explicit. TypeScript 7 defaults `types`
to `[]`; the root already declares Node and Vitest globals, but Node workspace
packages should explicitly declare Node types where they use globals. Other
new defaults should remain explicit in repository configs when they are part of
the contract. ([TypeScript 7 defaults][ts7])

Project references are not needed now. They can improve build/editor time and
enforce project boundaries, but referenced projects require `composite`,
declaration output, and an explicit dependency graph. TypeScript recommends
them when a codebase is non-trivial or editor/build measurements justify the
split. The present four independent checks are easier to understand at this
size. ([project references][ts-project-references],
[TypeScript performance guidance][ts-performance])

Oxlint can report compiler diagnostics with `--type-aware --type-check` while
reusing the same TypeScript program. Keep this as a later optimization: the
feature is still marked experimental, it ties compiler diagnostics to the
`oxlint-tsgolint` version, and there is no meaningful duplicate-analysis cost
at 45 lines. ([type-aware guide][oxlint-typed], [Oxlint CLI][oxlint-cli])

### Runtime behavior is separate

Node can execute TypeScript containing erasable syntax by stripping types, but
it performs no type checking and ignores `tsconfig.json`. It therefore does not
replace `tsc`, typed linting, module checking, or downlevel emit. If direct
`.ts` execution becomes a runtime decision, use `erasableSyntaxOnly` and
`verbatimModuleSyntax` to align authoring constraints, while retaining the
checker. ([Node type stripping][node-typescript],
[`erasableSyntaxOnly`][ts-erasable])

Replacing TypeScript with JavaScript plus JSDoc would be a language/model change,
not a faster implementation of the same checks. Nothing in the current
repository justifies losing TypeScript's explicit contracts.

### Formatting is separate

The lowest-risk default would keep Prettier:

- Biome cannot yet format all Markdown and YAML covered by the current script.
- Oxfmt passes Oxc's JavaScript/TypeScript Prettier conformance suite and covers
  the repository's other languages by bundling Prettier, but it is still beta.
  That changes the dependency shape without producing meaningful benefit in a
  tiny repository. ([Oxfmt beta][oxfmt-beta], [Oxfmt language
  support][oxfmt-languages])

The project owner chose Oxfmt to standardize on the Oxc toolchain despite its
beta status. Preserve the existing formatting contract during migration rather
than enabling unrelated sorting behavior. Reconsider Biome formatting after
Markdown and YAML become supported.

## Recommendation

Adopt this target, but migrate with a temporary dual run:

```text
type checker: TypeScript 7 `tsc --noEmit`
linter:      Oxlint + version-aligned `oxlint-tsgolint`, type-aware enabled
formatter:   Oxfmt
runtime:     unchanged
```

This is better than the current implementation because it adds type-aware lint
confidence, removes the TypeScript 6 API constraint imposed by
typescript-eslint, and moves the authoritative checker from 5.9 to the current
native TypeScript line. It does not collapse separate responsibilities merely
to reduce the tool count.

Do **not** add project references or make Oxlint `--type-check` the only
type-check gate now.

## Migration outline

1. Record current ESLint and `tsc` diagnostics as the baseline.
2. Upgrade TypeScript 5.9 to 6.0, fix deprecations/default changes, and run all
   four current project checks.
3. Upgrade to TypeScript 7.0.2, make `types` explicit per environment, and
   verify editor, test, Node package, and browser package resolution.
4. Add version-aligned Oxlint and `oxlint-tsgolint`; migrate the simple ESLint
   config, enable type-aware rules, and preserve ignores and unused-suppression
   reporting.
5. Run ESLint and Oxlint together for one transition change. Classify every
   diagnostic difference; do not silence a rule merely to reach parity.
6. If required rules and editor diagnostics are sound, remove ESLint,
   `@eslint/js`, typescript-eslint, and the old config; convert the one local
   suppression.
7. Replace Prettier with Oxfmt while preserving the existing print width and
   avoiding unrelated import or package sorting.
8. Keep `tsc --noEmit`, tests, Oxlint, and Oxfmt as independent CI gates.

## Conditions that change the recommendation

- Keep improved ESLint + `recommendedTypeChecked` on TypeScript 6 if Oxlint
  produces a semantic mismatch or a required ESLint plugin is unsupported.
- Use a short Oxlint + ESLint hybrid if a future plugin gap is narrow; remove
  the hybrid once the gap closes.
- Reconsider Biome if its type-aware rules reach TypeScript-equivalent coverage,
  its TypeScript language support reaches the active compiler, and Markdown/YAML
  formatting becomes complete.
- Add project references and `tsc -b` only when workspace packages acquire real
  dependency edges or measurements show repeated checking/editor scale is a
  problem.
- Consider Oxlint `--type-check` as the sole CI checker only after the
  experimental label is removed and diagnostic parity with the pinned
  TypeScript compiler is verified.
- Reassess Oxfmt after each major release while it remains beta.

[biome-2-5]: https://biomejs.dev/internals/changelog/version/2-5-0...latest/
[biome-config]: https://biomejs.dev/reference/configuration/
[biome-editor]: https://biomejs.dev/reference/vscode
[biome-floating]: https://biomejs.dev/linter/rules/no-floating-promises/
[biome-languages]: https://biomejs.dev/internals/language-support/
[biome-prettier]: https://biomejs.dev/formatter/differences-with-prettier/
[biome-v2]: https://biomejs.dev/blog/biome-v2/
[node-typescript]: https://nodejs.org/download/release/latest-v24.x/docs/api/typescript.html
[oxfmt-beta]: https://oxc.rs/blog/2026-02-24-oxfmt-beta
[oxfmt-languages]: https://oxc.rs/docs/guide/usage/formatter/language-support
[oxlint]: https://oxc.rs/docs/guide/usage/linter.html
[oxlint-cli]: https://oxc.rs/docs/guide/usage/linter/cli
[oxlint-editors]: https://oxc.rs/docs/guide/usage/linter/editors
[oxlint-migrate]: https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint
[oxlint-monorepo]: https://oxc.rs/docs/guide/usage/linter/nested-config
[oxlint-plugins]: https://oxc.rs/docs/guide/usage/linter/plugins
[oxlint-typed]: https://oxc.rs/docs/guide/usage/linter/type-aware
[oxlint-typed-stable]: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable.html
[ts-erasable]: https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html
[ts-performance]: https://github.com/microsoft/TypeScript/wiki/Performance
[ts-project-references]: https://www.typescriptlang.org/docs/handbook/project-references.html
[ts6]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
[ts7]: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
[tse-configs]: https://typescript-eslint.io/users/configs/
[tse-monorepos]: https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
[tse-project-service]: https://typescript-eslint.io/blog/project-service/
[tse-typed]: https://typescript-eslint.io/getting-started/typed-linting/
