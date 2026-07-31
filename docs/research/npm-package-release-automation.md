---
kind: research
description: Evaluates automated npm release approaches and recommends Release Please
tags: [release]
---

# npm package release automation

## Research question

What is the easiest current, high-quality way to publish Waymark to npm after
changes land on the default branch, while maintaining SemVer versions and a
changelog, creating visible GitHub Releases, and following current npm and
GitHub supply-chain guidance?

- **Status:** Complete
- **Last updated:** 2026-07-30
- **Source policy:** Primary sources only: npm and GitHub documentation, plus
  the official repositories and documentation for the compared release tools.

## Recommendation (inference)

Use **Release Please**, targeting the publishable package at `cli`. Keep CI and
release as separate workflows, but remove the copied CI job from the release
workflow. Perform npm publication in a separate conditional job after Release
Please. Keep the small manifest configuration because it explicitly records
Waymark's nested package and initial `0.1.0` baseline, not because Release
Please requires manifest mode for a single package.

This gives the repository a deliberate release gate without manual version
editing:

1. A normal push to the default branch updates or opens a Release Please pull
   request.
2. That pull request contains the next version and the package changelog.
3. Merging that release pull request creates the Git tag and published GitHub
   Release.
4. In the same workflow run, a separate job publishes the exact released
   package to npm through npm Trusted Publishing (OIDC).

In other words, normal feature pushes do **not** immediately publish. The push
created by merging the release pull request publishes automatically. That is
the safer interpretation of “publish after push to the default branch” for a
public package: every release is reviewed, but there is no manual `npm publish`,
tag, release-note, or version-bump step.

Release Please is the best fit here because the repository already uses
Conventional Commits, has one publishable package, and wants both a committed
changelog and GitHub Releases. Release Please explicitly automates changelog
generation, version updates, tags, and GitHub Releases, while deliberately
leaving registry publication to the workflow
([Release Please overview](https://github.com/googleapis/release-please#readme)).

## Current repository facts

These are observations from the local checkout, not claims from external
sources:

- The current branch is `main`, not `master`. The automation should target
  `main` unless the GitHub default branch is intentionally renamed.
- No Git remote is configured in this checkout. The package manifest now
  declares `https://github.com/ysfaran/waymark`; verify that this is the
  canonical public repository before copying its owner/repository into npm's
  Trusted Publisher settings.
- The root `package.json` is private. The actual publishable package is
  `cli/package.json`.
- The package is currently named `waymark-docs`, is at `0.1.0`, exposes the
  `waymark` binary, includes only `dist`, and requires Node `>=24`.
- The repository pins Node `24.18.0` and pnpm `11.18.0`; that Node installation
  currently provides npm `11.16.0`, above Trusted Publishing's minimum.
- There are no Git tags in the current history.
- The package manifest now contains GitHub `repository`, `homepage`, `bugs`,
  public `publishConfig` metadata, and an MIT license. npm specifically requires
  `repository.url` to match the GitHub repository exactly for Trusted Publishing
  ([npm Trusted Publishing troubleshooting](https://docs.npmjs.com/trusted-publishers/#troubleshooting)).
- Package identity should be finalized before the first publish. See the
  separate
  [npm package naming research](npm-cli-package-naming.md), because an npm
  name/version pair cannot be reused after publication
  ([npm publish](https://docs.npmjs.com/cli/publish/)).

## Sourced findings

### Release Please

Release Please derives release changes from Conventional Commits and maintains
a release pull request. Merging that pull request updates the changelog and
language-specific version files, tags the release commit, and creates a GitHub
Release. `fix:` maps to a patch, `feat:` to a minor, and a breaking `!` marker
to a major. Its maintainers recommend squash merging for a linear history and
cleaner generated release notes
([Release Please workflow and commit behavior](https://github.com/googleapis/release-please#readme)).

Release Please does not publish to package registries itself. Its official
GitHub Action exposes a release-created flag, tag, SHA, version, and release
body; manifest packages under a nested path receive path-prefixed outputs. The
workflow can therefore conditionally run `npm publish` only when a release was
actually created
([Release Please Action outputs](https://github.com/googleapis/release-please-action#outputs)).

The manifest mode supports a single nested package as well as monorepos. An
empty manifest starts a Node package at the tool's current default first
version (`0.1.0`), `bootstrap-sha` limits how far back the initial changelog
looks, and a manifest entry records a package's already released/current
version. `include-component-in-tag: false` changes the default
`<component>-v<version>` tag scheme to the simpler `v<version>`
([manifest bootstrap and tag behavior](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)).

As of this research date, the current Release Please Action release is
`v5.0.0`; it moved the action runtime to Node 24 and bundles Release Please
`17.6.1`
([Release Please Action releases](https://github.com/googleapis/release-please-action/releases),
[action manifest](https://github.com/googleapis/release-please-action/blob/main/package.json)).

### What the yargs example demonstrates

Release Please links yargs from the `node` row of its supported-strategies
table. The table describes a Node repository containing `package.json` and
`CHANGELOG.md`; it does not present yargs's GitHub Actions workflow as a
recommended publishing architecture
([Release Please strategy table](https://github.com/googleapis/release-please#strategy-language-types-supported)).

As inspected at yargs commit
[`3a49608`](https://github.com/yargs/yargs/commit/3a49608514b805393a3a2e5d00f39cdda9500f63),
yargs has two independent workflows:

- [`ci.yaml`](https://github.com/yargs/yargs/blob/3a49608514b805393a3a2e5d00f39cdda9500f63/.github/workflows/ci.yaml)
  runs tests on pull requests and pushes to `main`, across several Node
  versions plus Windows, Deno, dependency-update, and coverage jobs.
- [`release-please.yml`](https://github.com/yargs/yargs/blob/3a49608514b805393a3a2e5d00f39cdda9500f63/.github/workflows/release-please.yml)
  is one job triggered by pushes to `main` or a manual dispatch. It passes
  `release-type: node` directly to Release Please, then compiles the package.
  Only when `release_created` is true does it update a separate Deno release
  branch and publish to npm.

yargs does not have a `release-please-config.json` or
`.release-please-manifest.json` at that commit. The official action documents
this inline `release-type` form as its most straightforward, least-customizable
configuration. It also offers a `path` input for a package outside the
repository root. Manifest configuration is for advanced configuration and
multi-artifact releases, although it supports a single package too
([Release Please Action basic and advanced configuration](https://github.com/googleapis/release-please-action#basic-configuration),
[action inputs](https://github.com/googleapis/release-please-action#action-inputs),
[manifest mode](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)).

The yargs workflow is small partly because it makes different security and
reliability choices from Waymark:

- It has no dependency on the CI workflow and does not rerun the full test
  matrix before publishing. It repeats `npm ci` and compilation, so it is not
  entirely duplicate-free, and npm publication can start while the independent
  `main` CI run is still running.
- It uses one job with `contents: write` and `pull-requests: write`; there is no
  separate least-privilege publishing job, GitHub environment, released-SHA
  checkout, concurrency control, timeout, package-existence check, or
  tag-verification recovery path.
- It pins actions to full commit SHAs, which is stronger than Waymark's exact
  version tags.
- Its npm publish still sends a stored `NPM_TOKEN` secret to Google's external
  npm automation registry. yargs has an open request to adopt npm Trusted
  Publishing, so this part is not a current model for a new package
  ([yargs trusted-publishing issue](https://github.com/yargs/yargs/issues/2488)).

yargs's `workflow_dispatch` has no recovery input or existing-release
verification. It was added on 2026-07-26 simply to allow a manual Release Please
run
([yargs dispatch commit](https://github.com/yargs/yargs/commit/db916b4154271e4cbbd2c60618fab90bdc1dbac2)).
It therefore does not justify Waymark's more elaborate tag-based npm recovery
branch.

Do not copy yargs's action reference verbatim. It still names the archived
`google-github-actions/release-please-action` repository; the maintained action
is `googleapis/release-please-action`
([archived action repository](https://github.com/google-github-actions/release-please-action),
[maintained Release Please Action](https://github.com/googleapis/release-please-action)).

### Changesets

Changesets makes authors add a small changeset file that declares the affected
package, desired SemVer bump, and human-written summary. Its version step
consumes those files into package versions and changelogs, and its publish step
publishes package versions not already present in npm
([Changesets introduction](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md),
[versioning and publishing guide](https://changesets.dev/guide/versioning-and-publishing)).

The stable Changesets Action creates/updates a version pull request, can
publish after that pull request is merged, and creates GitHub Releases by
default. Stable action `v1.9.0` supports npm OIDC publishing; `v1.7.0` fixed its
`.npmrc` handling so an absent npm token does not write an invalid credential.
The `v2` action and Changesets CLI `v3` were still prereleases on the research
date. The stable CLI was `2.31.1`
([Changesets Action releases](https://github.com/changesets/action/releases),
[Changesets releases](https://github.com/changesets/changesets/releases)).

Changesets' own current guide says a brand-new npm package must first be
published manually, after which Trusted Publishing can be configured. It
suggests a `0.0.0` stub followed by a changeset for the intended initial
version
([Changesets Trusted Publishing bootstrap](https://changesets.dev/guide/versioning-and-publishing#trusted-publishing)).

### semantic-release

semantic-release analyzes every new commit on a configured release branch and,
for releasable changes, calculates the version, publishes to npm, creates the
Git tag, and creates the GitHub Release. Its default plugins include commit
analysis, release-note generation, npm publication, and GitHub publication
([semantic-release workflow](https://semantic-release.gitbook.io/semantic-release/)).

By default, semantic-release does **not** commit the calculated version back to
the repository. Its npm plugin changes `package.json` in the package it
publishes, while the Git tag remains the version source of truth. The project
explicitly recommends against committing that version because failure paths
can leave Git and the registry out of sync. It also considers a committed
changelog redundant with GitHub Release notes
([semantic-release FAQ](https://semantic-release.gitbook.io/semantic-release/support/faq)).

semantic-release's default first `feat:` release is `1.0.0`, and it does not
support choosing an initial `0.0.1`-style version; it recommends prereleases
for not-yet-stable software
([initial-release recipe](https://semantic-release.gitbook.io/semantic-release/recipes/release-workflow/pre-releases),
[initial-version FAQ](https://semantic-release.gitbook.io/semantic-release/support/faq#can-i-set-the-initial-release-version-of-my-package-to-0-0-1)).

As of this research date, the current release was `25.0.8`. Its package engine
requires Node `^22.14.0 || >=24.10.0`, and the official GitHub Actions recipe
supports npm Trusted Publishing with `id-token: write`
([semantic-release releases](https://github.com/semantic-release/semantic-release/releases),
[current package manifest](https://github.com/semantic-release/semantic-release/blob/master/package.json),
[GitHub Actions recipe](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions)).

## Comparison and fit (recommendation/inference)

| Criterion              | Release Please                      | Changesets                                    | semantic-release                                                                 |
| ---------------------- | ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Version decision       | Conventional Commit history         | Explicit per-change files                     | Conventional Commit history                                                      |
| Committed version      | Yes, through release PR             | Yes, through version PR                       | No by default                                                                    |
| Committed changelog    | Yes                                 | Yes                                           | No by default                                                                    |
| GitHub Release         | Yes                                 | Yes by default after publish                  | Yes by default                                                                   |
| npm publish            | Add a conditional workflow step/job | Built into action/CLI flow                    | Built into default plugin flow                                                   |
| Human release gate     | Merge release PR                    | Merge version PR                              | None by default                                                                  |
| Contributor ceremony   | Correct squash commit title         | Add a changeset on relevant PRs               | Correct squash commit title                                                      |
| Nested package support | Manifest path                       | First-class workspace focus                   | Possible, but extra configuration/plugins                                        |
| Pre-1.0 bootstrap      | Directly configurable               | Directly configurable                         | Awkward; defaults to `1.0.0`                                                     |
| Best fit here          | **Yes**                             | Good, but more process than one package needs | Only if literal every-push release matters more than committed changelog/version |

Changesets would become the stronger choice if Waymark grows into several
independently versioned public packages or if contributors must explicitly
author release-note prose in each feature pull request. semantic-release would
be the strongest choice only if every releasable push must publish immediately
and the repository is comfortable treating Git tags and GitHub Releases—not a
committed changelog or package version—as the release record.

## Recommended workflow design (inference)

Follow yargs's broad shape: keep the existing pull-request/`main` CI workflow,
and use a separate `main`-push release workflow. Unlike the current Waymark
workflow, do not copy the CI job into the release workflow. This is the smallest
setup and relies on required pull-request checks as the quality gate.

The tradeoff is explicit: the release workflow does not wait for the independent
CI run on the same `main` push. That is also how yargs works. If Waymark later
requires a post-merge CI gate immediately before publication, combine the
workflows into a linear check → release → publish workflow; do not duplicate
the check job.

Keep release creation and npm publication in the same workflow because most
events caused by the repository `GITHUB_TOKEN` do not start another workflow
([GitHub `GITHUB_TOKEN` event behavior](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs)).

Use two jobs:

### 1. Release-management job

- Grant only `contents: write`, `pull-requests: write`, and `issues: write`,
  matching the permissions documented by Release Please
  ([Release Please Action permissions](https://github.com/googleapis/release-please-action#workflow-permissions)).
- Run Release Please in manifest mode for `cli`.
- Export only the nested package's `release_created` and `sha` outputs needed by
  the publish job.
- Do **not** grant this job `id-token: write`; it has no reason to mint the npm
  publishing identity.

### 2. Publish job

- Run only when Release Please says the `cli` release was created.
- Check out the released SHA, not a floating branch head.
- Reference a GitHub environment such as `npm` or `production`.
- Give this job only `contents: read` and `id-token: write`.
- Use a GitHub-hosted runner, install the repository-pinned Node and pnpm
  versions, and disable package-manager caching in the release job. npm's
  current Trusted Publishing example says release builds should set
  `package-manager-cache: false`
  ([npm Trusted Publishing GitHub example](https://docs.npmjs.com/trusted-publishers/#github-actions-configuration)).
- Install with `pnpm install --frozen-lockfile --ignore-scripts`; `npm publish`
  invokes the package's `prepack` build.
- Run the actual `npm publish` from `cli` so the npm CLI, rather
  than another package manager's publish wrapper, performs the OIDC exchange.

The explicit manifest, released-SHA checkout, separate job permissions,
Trusted Publishing, and npm environment are modest safeguards worth retaining.
They make state and trust boundaries explicit without adding recovery branches.

The following are optional and should be omitted initially:

- a second copy of the check job in a separate release workflow;
- a tag-based `workflow_dispatch` recovery mode and its release verification;
- an `npm view` package-existence shell script; and
- extra release outputs that the publish job does not consume.

GitHub's **Re-run failed jobs** is enough for the normal transient-failure case.
If npm accepted a publication but the runner lost the success response, a rerun
will fail because npm versions are immutable; that rare case can be confirmed
in npm rather than carrying a permanent recovery subsystem
([npm package name/version immutability](https://docs.npmjs.com/cli/publish/)).
Add dedicated recovery automation only after an actual need appears.

Use current stable action majors at implementation time—currently
`actions/checkout@v7`, `actions/setup-node@v7`,
`pnpm/action-setup@v6`, and `googleapis/release-please-action@v5`—but pin each
third-party action to the reviewed **full commit SHA** and leave the version as
a comment. GitHub says a full SHA is the only immutable way to reference an
action and recommends explicit least-privilege workflow permissions
([GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions)).

The repository implementation intentionally uses exact release tags such as
`actions/checkout@v7.0.1` for readability and easier maintenance. Unlike a full
commit SHA, a version tag can be moved, so this is a deliberate tradeoff from
GitHub's strongest supply-chain recommendation.

The current action versions above are evidenced by their official release
pages:

- [Checkout `v7.0.1`](https://github.com/actions/checkout/releases)
- [Setup Node `v7.0.0`](https://github.com/actions/setup-node/releases)
- [pnpm Action Setup `v6.0.9`](https://github.com/pnpm/action-setup/releases)
- [Release Please Action `v5.0.0`](https://github.com/googleapis/release-please-action/releases)

## npm Trusted Publishing, provenance, and first release

### Sourced facts

npm Trusted Publishing exchanges a GitHub Actions OIDC identity for a
short-lived npm publish credential, removing the need for a long-lived
`NPM_TOKEN`. It currently requires npm CLI `11.5.1` or later and Node
`22.14.0` or later. For GitHub Actions it requires a GitHub-hosted runner,
`id-token: write`, and an npm-side configuration containing the GitHub
owner/repository, exact workflow filename, optional GitHub environment, and
allowed action (`npm publish`, `npm stage publish`, or both)
([npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)). npm
allows one trusted publisher configuration per package, so the workflow
identity should be intentionally stable.

With a public package published from a public GitHub repository through Trusted
Publishing, npm automatically generates provenance; `--provenance` is no
longer required. Provenance is not generated from a private source repository
even if the npm package is public
([npm provenance](https://docs.npmjs.com/generating-provenance-statements/),
[Trusted Publishing automatic provenance](https://docs.npmjs.com/trusted-publishers/#automatic-provenance-generation)).

npm recommends disabling traditional token-based publishing after Trusted
Publishing has been verified and revoking obsolete automation tokens. npm's
maximum-security alternative is to authorize only `npm stage publish`, which
requires an interactive 2FA approval before the staged package becomes public
([npm token restriction and staged-publish guidance](https://docs.npmjs.com/trusted-publishers/#recommended-restrict-token-access-when-using-trusted-publishers)).

The package must already exist in the npm registry before its Trusted Publisher
can be configured, so the first-ever publication cannot use this OIDC route
([npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/)).

### Recommendation/inference

For the requested fully automatic post-merge release, authorize only
`npm publish`, not `npm stage publish`, and disallow token publishing after the
OIDC path has succeeded once. The Release Please pull request plus protected
`main` branch is the human approval gate.

Bind the npm Trusted Publisher to a named GitHub environment and configure that
environment to allow deployments from `main` only. npm's trust record identifies
the workflow and optional environment, while GitHub environment deployment
branch rules restrict which refs may enter that environment
([npm GitHub publisher fields](https://docs.npmjs.com/trusted-publishers/#for-github-actions),
[GitHub deployment branches and tags](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments#deployment-branches-and-tags)).

A new package does not yet have the npm package-settings page on which to
configure its Trusted Publisher. The simplest bootstrap is therefore:

1. Finalize and reserve the package name.
2. Make one local, 2FA-protected `0.0.0` stub publication as described in the
   Changesets first-party guide, or make the first real publication with a
   short-lived granular token and immediately revoke it.
3. Configure the package's npm Trusted Publisher for the exact release workflow
   filename and GitHub environment.
4. Run a dry-run/real OIDC release, then set npm publishing access to disallow
   traditional tokens.

The `0.0.0` stub is the easiest official-tool bootstrap, but the temporary-token
first real release is aesthetically cleaner because npm will not retain an
unprovenanced stub version. This is a one-time tradeoff, not part of steady
state.

## Release Please bootstrap for this history

The repository already declares `0.1.0`, but has no release tag. Do not let the
first automated run infer its boundary accidentally.

Recommended bootstrap:

- Create manifest configuration for `cli` with release type `node`.
- Use `include-component-in-tag: false` because there is only one public
  artifact, producing the conventional `v0.1.0` style instead of
  `waymark-docs-v0.1.0`.
- Choose a `bootstrap-sha` one commit before the first change intended for the
  initial changelog.
- Explicitly force the intended first real release with Release Please's
  `release-as`/`Release-As` mechanism if the empty-manifest default is not
  sufficient.
- After the first release is merged, remove one-time bootstrap overrides and
  let the manifest and tags drive subsequent releases.

Release Please documents both `bootstrap-sha` and manually seeded current
versions, and supports `Release-As: x.x.x` for a deliberate next version
([manifest bootstrap](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md#bootstrapping),
[Release-As](https://github.com/googleapis/release-please#how-do-i-change-the-version-number)).

## Branch, environment, and release protection

### Sourced facts

GitHub branch rulesets can require pull requests, successful status checks,
conversation resolution, signed commits, and linear history, and can block
force pushes and deletion
([GitHub ruleset capabilities](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)).

GitHub environments can restrict deployments to protected or specifically
selected branches and tags, and can optionally require reviewers
([GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)).

GitHub now supports immutable Releases. Once enabled, a published Release's tag
cannot be moved, its assets cannot be changed, and GitHub automatically creates
a release attestation. GitHub recommends creating a draft first only when
assets must be attached before publication
([GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)).

When a workflow creates or updates a pull request with `GITHUB_TOKEN`, the
`pull_request` workflow runs are created in an approval-required state. A
GitHub App installation token or personal access token can cause those checks
to run normally
([GitHub workflow-trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow)).

### Recommendation/inference

Protect `main` with a ruleset that:

- requires a pull request;
- requires the repository's format, lint, typecheck, build/package, and test
  checks;
- requires conversation resolution;
- blocks force pushes and deletion;
- requires linear history and uses squash merge, which also gives Release
  Please one clean Conventional Commit title per merged pull request; and
- applies to administrators unless an explicitly documented emergency bypass
  is wanted.

Add CODEOWNERS coverage for `.github/workflows/` so release-identity changes
receive explicit review.

Protect the publishing environment so only `main` may deploy. A required
environment reviewer is optional: it adds another manual approval after the
release pull request merge, so it conflicts with the requested automatic
publication.

Enable immutable GitHub Releases. This package currently has no separate binary
release assets, so Release Please can publish the release directly without a
draft-asset phase.

Start with the built-in `GITHUB_TOKEN` for Release Please. If required CI on the
automation-created release PR becomes annoying, prefer a narrowly scoped
GitHub App installation token over a long-lived personal access token. GitHub
documents installation tokens as one-hour credentials and states that GitHub
Apps should be used for independent automation
([GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation),
[GitHub App best practices](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app)).

## Version and compatibility snapshot

| Component               | Current constraint/fact on 2026-07-30    | Consequence here                                                                                          |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| npm Trusted Publishing  | npm `>=11.5.1`, Node `>=22.14.0`         | Pinned Node 24 satisfies Node; verify/upgrade the npm CLI in the publish job if the runner image is older |
| Project runtime         | Node `>=24`; repo pins `24.18.0`         | Test and publish with the repository pin                                                                  |
| Project package manager | pnpm `11.18.0`                           | Let pnpm Action Setup read the pin; do not float the project package manager                              |
| Release Please Action   | `v5.0.0`, Node 24 action runtime         | Use v5, pinned to its full SHA                                                                            |
| Changesets stable       | Action `v1.9.0`, CLI `2.31.1`            | Do not adopt the `v2` action/CLI v3 prereleases for this package                                          |
| semantic-release        | `25.0.8`; Node `^22.14.0 \|\| >=24.10.0` | Compatible with the project pin, but not the preferred release model                                      |
| Checkout                | `v7.0.1`                                 | Use v7, pinned to full SHA                                                                                |
| Setup Node              | `v7.0.0`                                 | Use v7, pinned to full SHA                                                                                |
| pnpm Action Setup       | `v6.0.9`                                 | Use v6, pinned to full SHA                                                                                |

## Acceptance criteria for the eventual implementation

The release setup is complete when all of these are demonstrably true:

- A feature/fix commit on `main` creates or updates one Release Please PR.
- The PR changes only the expected version, manifest, and changelog files.
- Merging it creates a `vX.Y.Z` tag and visible, published, immutable GitHub
  Release with notes matching the changelog.
- The publish job runs only for a newly created release and publishes the
  checkout at the released SHA.
- npm displays the same version and a provenance attestation linked to the
  correct public GitHub repository/workflow.
- No reusable npm write token remains in GitHub.
- A second non-release push does not attempt to republish an existing
  name/version.
- The packed artifact contains the executable `dist/cli.js`, required runtime
  files, README, and license, and a clean-room install can run
  `waymark --version` and `waymark --help`.

## Primary sources

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm publish](https://docs.npmjs.com/cli/publish/)
- [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)
- [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/)
- [GitHub secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub workflow permissions and OIDC](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub workflow-trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub immutable Releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [Release Please](https://github.com/googleapis/release-please)
- [Release Please manifest mode](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
- [Release Please Action](https://github.com/googleapis/release-please-action)
- [Archived predecessor action](https://github.com/google-github-actions/release-please-action)
- [yargs CI workflow](https://github.com/yargs/yargs/blob/3a49608514b805393a3a2e5d00f39cdda9500f63/.github/workflows/ci.yaml)
- [yargs Release Please workflow](https://github.com/yargs/yargs/blob/3a49608514b805393a3a2e5d00f39cdda9500f63/.github/workflows/release-please.yml)
- [yargs Trusted Publishing request](https://github.com/yargs/yargs/issues/2488)
- [Changesets](https://github.com/changesets/changesets)
- [Changesets Action](https://github.com/changesets/action)
- [Changesets versioning and publishing](https://changesets.dev/guide/versioning-and-publishing)
- [semantic-release](https://semantic-release.gitbook.io/semantic-release/)
- [semantic-release GitHub Actions recipe](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions)
