---
kind: adr
description: Explains why each repository has one shared Waymark configuration
tags: [architecture, waymark-config]
---

# Use one configuration per repository

Waymark will use one repository-wide configuration rather than merging or
inheriting nested package configurations. This ensures a coding agent sees the
same declared kinds, tags, and documents from every directory, including in
monorepos, at the cost of requiring packages to coordinate one shared
vocabulary. The configuration root is the directory containing `waymark.yml`
or `waymark.yaml`; Waymark finds it by walking upward from the current directory
without depending on Git, and treats another supported configuration file
beneath that root as an invalid nested configuration.
