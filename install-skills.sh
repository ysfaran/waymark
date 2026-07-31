#!/bin/bash

# workaround script to install skills to codex and claude
# for details see: https://github.com/vercel-labs/skills/issues/549#issuecomment-4140445330

set -e
cd "$(dirname "$0")"
pnpm skills experimental_install
mkdir -p .claude/skills
for skill in .agents/skills/*/; do
  name="$(basename "$skill")"
  ln -sfn "../../.agents/skills/$name" ".claude/skills/$name"
  ln -sf "../../.agents/skills/$name/SKILL.md" ".claude/skills/$name.md"
done

ln -sfn AGENTS.md CLAUDE.md