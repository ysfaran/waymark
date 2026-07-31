---
kind: agent-guide
description: Defines how agents find, write, and apply repository research
tags: [agents]
---

# Research Docs

Research findings for this repo live in `docs/research/`.

## Before researching

- Search `docs/research/` for existing work on the topic.
- Read relevant documents before starting a new investigation.
- Check each document's date and status before relying on time-sensitive findings.

## Writing research

- Store one topic per Markdown file at `docs/research/<topic-slug>.md`.
- Include the research question, status, last-updated date, findings, and source links.
- Prefer primary sources and distinguish sourced facts from inference.
- Update an existing document when continuing the same investigation instead of creating a duplicate.
- Add or update its entry in `docs/research/README.md`.

## Using research

Treat research documents as supporting evidence, not architectural decisions. Record durable technical decisions as ADRs under `docs/adr/`.
