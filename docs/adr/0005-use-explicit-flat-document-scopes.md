---
kind: adr
description: Explains optional flat scopes for selecting documents by applicability
tags: [architecture, waymark-documents, waymark-metadata]
---

# Use explicit flat document scopes

Waymark Documents may declare one or more scopes identifying the repository
areas where they apply, regardless of where the Markdown files are stored.
Scopes are declared in the repository configuration but are optional on
documents unless that configuration requires them. A coding agent selects
related scopes explicitly, such as `backend` and `search-service`; Waymark does
not infer parent scopes from names or paths. Within a scope filter, any named
scope matches, and documents without scopes do not match. This keeps discovery
predictable and avoids expanding every service query with unrelated documents.
