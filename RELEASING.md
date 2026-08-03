# Releasing Waymark

Waymark uses Release Please, GitHub Actions, and npm trusted publishing. No
long-lived npm token is stored in GitHub.

## How releases work

CI checks pull requests. Separately, Release Please updates a release pull
request from changes on `main`. Conventional Commit types determine the next
semantic version and the generated changelog:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- `feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer creates a major release.
- Other types such as `docs:`, `test:`, and `chore:` do not create a release by
  themselves.

The repository is one release component even though its published package lives
in `cli`. This keeps repository-level files that ship in the npm tarball, such
as `README.md`, inside the release scope. Use `fix(readme):` for a README change
that should produce a patch release; ordinary `docs:` commits remain
non-releasing. Release Please updates the matching versions in both the root and
`cli/package.json`.

Merge the release pull request when its version and changelog are ready. The
same workflow then:

1. creates a `vX.Y.Z` tag and a visible GitHub Release;
2. publishes `cli` to npm through short-lived OIDC credentials;
3. lets npm attach provenance to the public package.

The release workflow targets `main`, which is this repository's current default
branch. CI and release run independently, so protect `main` with required CI
checks instead of repeating those checks in the release workflow.

## Keeping the workflow current

Dependabot checks the pnpm dependencies and exact GitHub Action version tags
weekly. Review and merge those updates like normal dependency changes.

## Retrying a failed npm publish

Use **Re-run failed jobs** on the original Release workflow run. The publish job
will use the same released commit. If npm already accepted the version before
the job failed, confirm it on npm instead of rerunning because published
versions cannot be replaced.
