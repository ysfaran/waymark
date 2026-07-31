# AGENTS instructions

## Documentation discovery

Use the local Waymark CLI before exploring or changing the repository:

```sh
pnpm --filter waymark-docs dev status --show kind,tags
pnpm --filter waymark-docs dev find --kinds agent-guide --tags agents --show description
```

Choose kinds and tags relevant to the task. Add `--query "<text>"` when metadata
filters alone are too broad.

## Agent skills

### Skills: local & installation

Edit local skills only in `skills/`, never in generated `.agents/` or `.claude/` copies. Run `pnpm skills:refresh` to install or refresh local and external skills.

### Issue tracker

Issues and PRDs are tracked as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain docs use the single-context layout. See `docs/agents/domain.md`.

### Research docs

Read relevant research in `docs/research/` before investigating a topic. See `docs/agents/research.md`.
