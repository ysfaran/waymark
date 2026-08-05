import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { integrationTest, runWaymark } from "../cli-test-fixture.js";

integrationTest(
  "status discovers a waymark.yml root and summarizes a valid repository",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const nestedPath = join(repositoryPath, "packages", "example");
    await mkdir(nestedPath, { recursive: true });
    await writeFile(
      join(repositoryPath, "waymark.yml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "tags:\n" +
        "  typescript: TypeScript implementation\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "decision.md"),
      "---\n" +
        "kind: adr\n" +
        "description: Choose the runtime\n" +
        "tags: [typescript]\n" +
        "---\n" +
        "# Runtime\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "README.md"),
      "# Repository\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: nestedPath,
    });

    expect(result.status).toBe(0);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\n` +
        "Status: valid\n" +
        "Waymark Documents: 1\n" +
        "Unregistered Documents: 1\n" +
        "Kinds: 1\n" +
        "Tags: 1\n",
    );
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status reports every configuration problem in deterministic field order",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: sometimes\n" +
        "kinds:\n" +
        "  Bad_ID: ''\n" +
        "tags:\n" +
        "  topic: '   '\n" +
        "ignore: generated/**\n" +
        "exclude: []\n" +
        "mystery: true\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: waymark.yaml: exclude: Unknown field.\n" +
        "error: waymark.yaml: ignore: Expected a sequence of ignore globs.\n" +
        "error: waymark.yaml: kinds.Bad_ID: Description must be a non-empty string.\n" +
        "error: waymark.yaml: kinds.Bad_ID: Identifier must use lowercase kebab-case.\n" +
        "error: waymark.yaml: mystery: Unknown field.\n" +
        "error: waymark.yaml: require-namespace: Expected a boolean.\n" +
        "error: waymark.yaml: tags.topic: Description must be a non-empty string.\n",
    );
  },
);

integrationTest(
  "status stops before document scanning when configuration is invalid",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: sometimes\n" +
        "kinds:\n" +
        "  guide: 42\n" +
        "tags: []\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "document.md"),
      "---\nkind: guide\ndescription: 42\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: waymark.yaml: kinds.guide: " +
        "Description must be a non-empty string.\n" +
        "error: waymark.yaml: require-namespace: Expected a boolean.\n" +
        "error: waymark.yaml: tags: Expected a mapping.\n",
    );
  },
);

integrationTest(
  "status scans Markdown and MDX while honoring every ignore boundary",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs"), { recursive: true });
    await mkdir(join(repositoryPath, "ignored"), { recursive: true });
    await mkdir(join(repositoryPath, "generated"), { recursive: true });
    await mkdir(join(repositoryPath, ".git"), { recursive: true });
    await mkdir(join(repositoryPath, "nested", ".git"), { recursive: true });
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n" +
        "ignore:\n" +
        "  - generated/**\n",
      "utf8",
    );
    await writeFile(join(repositoryPath, ".gitignore"), "ignored/\n", "utf8");
    const registeredDocument =
      "---\nkind: guide\ndescription: A guide\n---\n# Guide\n";
    await writeFile(
      join(repositoryPath, "docs", "guide.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "reference.mdx"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "ignored", "ignored.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "generated", "generated.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, ".git", "internal.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "nested", ".git", "internal.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "README.md"),
      "# Repository\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "notes.txt"),
      "Not Markdown\n",
      "utf8",
    );
    await symlink(
      join(repositoryPath, "docs"),
      join(repositoryPath, "linked-docs"),
      "dir",
    );
    await symlink(
      join(repositoryPath, "docs", "guide.md"),
      join(repositoryPath, "linked-guide.md"),
      "file",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Waymark Documents: 2\n");
    expect(result.stdout).toContain("Unregistered Documents: 1\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status recognizes flat and namespaced metadata without claiming unrelated frontmatter",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  onboarding: Onboarding\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "flat.md"),
      "---\n" +
        "kind: guide\n" +
        "description: Flat metadata\n" +
        "tags: [onboarding]\n" +
        "layout: docs\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "namespaced.mdx"),
      "---\n" +
        "title: Namespaced\n" +
        "waymark:\n" +
        "  kind: guide\n" +
        "  description: Namespaced metadata\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "unrelated.md"),
      "---\nkind: article\ntitle: Unrelated\n---\n",
      "utf8",
    );
    await writeFile(join(repositoryPath, "empty.md"), "---\n---\n", "utf8");

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Waymark Documents: 2\n");
    expect(result.stdout).toContain("Unregistered Documents: 2\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status aggregates document diagnostics in deterministic path-and-field order",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  topic: Topics\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "a-dual.md"),
      "---\n" +
        "kind: guide\n" +
        "description: Flat\n" +
        "waymark:\n" +
        "  kind: guide\n" +
        "  description: Namespaced\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "b-malformed.md"),
      "---\nwaymark: [unterminated\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "c-invalid.md"),
      "---\n" +
        "waymark:\n" +
        "  kind: missing-kind\n" +
        "  description: '   '\n" +
        "  tags: [missing-tag, topic, topic]\n" +
        "  extra: ignored\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "d-missing.md"),
      "---\nwaymark:\n  tags: topic\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "e-scalar-tags.md"),
      "---\nkind: guide\ndescription: Tagged\ntags: topic\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "f-unrelated.md"),
      "---\nkind: article\ntitle: Not Waymark metadata\ntags: topic\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "z-valid.md"),
      "---\nkind: guide\ndescription: Valid\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: a-dual.md: waymark: Flat and namespaced metadata cannot both be declared.\n" +
        "error: b-malformed.md: frontmatter: Malformed YAML frontmatter.\n" +
        "error: c-invalid.md: waymark.description: Document Description must be a non-empty string.\n" +
        "error: c-invalid.md: waymark.extra: Unknown field.\n" +
        'error: c-invalid.md: waymark.kind: Undeclared kind "missing-kind".\n' +
        'error: c-invalid.md: waymark.tags: Duplicate tag "topic".\n' +
        'error: c-invalid.md: waymark.tags: Undeclared tag "missing-tag".\n' +
        "error: d-missing.md: waymark.description: Document Description is required.\n" +
        "error: d-missing.md: waymark.kind: Document kind is required.\n" +
        "error: d-missing.md: waymark.tags: Expected a YAML sequence of tags.\n" +
        "error: e-scalar-tags.md: tags: Expected a YAML sequence of tags.\n",
    );
  },
);

integrationTest(
  "status reports every invalid tag while rejecting scalar namespaced metadata",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  topic: Topics\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "a-invalid-tags.md"),
      "---\n" +
        "waymark:\n" +
        "  kind: guide\n" +
        "  description: Invalid tags\n" +
        "  tags: [42, '', missing, missing, topic, topic]\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "b-scalar-metadata.md"),
      "---\nwaymark: metadata\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      'error: a-invalid-tags.md: waymark.tags: Duplicate tag "missing".\n' +
        'error: a-invalid-tags.md: waymark.tags: Duplicate tag "topic".\n' +
        "error: a-invalid-tags.md: waymark.tags: " +
        "Every tag must be a non-empty string.\n" +
        "error: a-invalid-tags.md: waymark.tags: " +
        "Every tag must be a non-empty string.\n" +
        'error: a-invalid-tags.md: waymark.tags: Undeclared tag "missing".\n' +
        "error: b-scalar-metadata.md: waymark: Expected a mapping.\n",
    );
  },
);

integrationTest(
  "status uses the outer root and rejects a nested configuration",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const nestedPath = join(repositoryPath, "packages", "example");
    await mkdir(nestedPath, { recursive: true });
    const minimalConfiguration =
      "require-namespace: false\nkinds: {}\ntags: {}\n";
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      minimalConfiguration,
      "utf8",
    );
    await writeFile(
      join(nestedPath, "waymark.yml"),
      minimalConfiguration,
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: nestedPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: packages/example/waymark.yml: configuration: " +
        "Nested Waymark configurations are not allowed.\n",
    );
  },
);

integrationTest(
  "status --show kind,tags lists declared values and usage counts",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "  adr: Architecture decisions\n" +
        "tags:\n" +
        "  typescript: TypeScript\n" +
        "  architecture: Architecture\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "decision.md"),
      "---\n" +
        "waymark:\n" +
        "  kind: adr\n" +
        "  description: Choose the runtime\n" +
        "  tags: [architecture]\n" +
        "---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status", "--show", "kind,tags"],
      workingDirectoryPath: repositoryPath,
    });
    const shorthandResult = runWaymark({
      arguments: ["status", "-s", "kind,tags"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\n` +
        "Status: valid\n" +
        "Waymark Documents: 1\n" +
        "Unregistered Documents: 0\n" +
        "Kinds: 2\n" +
        "Tags: 2\n" +
        "\n" +
        "Kinds:\n" +
        "  adr — Architecture decisions (1 document)\n" +
        "  guide — Guides (0 documents)\n" +
        "Tags:\n" +
        "  architecture — Architecture (1 document)\n" +
        "  typescript — TypeScript (0 documents)\n",
    );
    expect(result.stderr).toBe("");
    expect(shorthandResult.status).toBe(0);
    expect(shorthandResult.stdout).toBe(result.stdout);
    expect(shorthandResult.stderr).toBe("");
  },
);

integrationTest(
  "status reports malformed configuration YAML at the repository root",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yml"),
      "kinds: [unterminated\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: waymark.yml: configuration: Malformed YAML configuration.\n",
    );
  },
);

integrationTest(
  "status rejects invalid configured ignore entries",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds: {}\n" +
        "tags: {}\n" +
        "ignore:\n" +
        "  - '!docs/**'\n" +
        "  - 42\n" +
        "  - ''\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: waymark.yaml: ignore.0: " +
        "Negation is not supported in ignore globs.\n" +
        "error: waymark.yaml: ignore.1: " +
        "Ignore glob must be a non-empty string.\n" +
        "error: waymark.yaml: ignore.2: " +
        "Ignore glob must be a non-empty string.\n",
    );
  },
);

integrationTest(
  "status treats flat-looking metadata as unregistered when namespaces are required",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: true\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "flat.md"),
      "---\nkind: guide\ndescription: Flat\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "namespaced.md"),
      "---\nwaymark:\n  kind: guide\n  description: Namespaced\n  tags: []\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Waymark Documents: 1\n");
    expect(result.stdout).toContain("Unregistered Documents: 1\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status fails clearly when no configuration can be found",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const nestedPath = join(repositoryPath, "nested");
    await mkdir(nestedPath);

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: nestedPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const canonicalNestedPath = await realpath(nestedPath);
    expect(result.stderr).toBe(
      `error: Could not find waymark.yml or waymark.yaml from ${canonicalNestedPath}.\n`,
    );
  },
);

integrationTest(
  "status rejects both configuration filenames in one directory",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const minimalConfiguration =
      "require-namespace: false\nkinds: {}\ntags: {}\n";
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      minimalConfiguration,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "waymark.yml"),
      minimalConfiguration,
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stderr).toBe(
      `error: Multiple Waymark configurations exist in ${canonicalRepositoryPath}: ` +
        "waymark.yml, waymark.yaml.\n",
    );
  },
);

integrationTest(
  "status treats gitignored and configured-ignore directories as outside the scan scope",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const ignoredPath = join(repositoryPath, "ignored");
    const configuredIgnorePath = join(repositoryPath, "configured-ignore");
    await mkdir(ignoredPath);
    await mkdir(configuredIgnorePath);
    const minimalConfiguration =
      "require-namespace: false\nkinds: {}\ntags: {}\n";
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      minimalConfiguration + "ignore: [configured-ignore/**]\n",
      "utf8",
    );
    await writeFile(join(repositoryPath, ".gitignore"), "ignored/\n", "utf8");
    await writeFile(
      join(ignoredPath, "waymark.yaml"),
      minimalConfiguration,
      "utf8",
    );
    await writeFile(
      join(configuredIgnorePath, "waymark.yaml"),
      minimalConfiguration,
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Waymark Documents: 0\n");
    expect(result.stdout).toContain("Unregistered Documents: 0\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status honors nested gitignore precedence and re-inclusion",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const docsPath = join(repositoryPath, "docs");
    await mkdir(docsPath);
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(join(repositoryPath, ".gitignore"), "docs/*.md\n", "utf8");
    await writeFile(join(docsPath, ".gitignore"), "!visible.md\n", "utf8");
    await writeFile(
      join(docsPath, "invalid.md"),
      "---\nwaymark: [unterminated\n---\n",
      "utf8",
    );
    await writeFile(
      join(docsPath, "visible.md"),
      "---\nkind: guide\ndescription: Visible guide\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Waymark Documents: 1\n");
    expect(result.stdout).toContain("Unregistered Documents: 0\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "status rejects configured ignore syntax beyond supported wildcards",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds: {}\n" +
        "tags: {}\n" +
        "ignore:\n" +
        "  - 'docs/!(private)/**'\n" +
        "  - 'docs/{one,two}.md'\n" +
        "  - 'docs/[ab].md'\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["status"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(result.stdout).toBe(
      `Root: ${canonicalRepositoryPath}\nStatus: invalid\n`,
    );
    expect(result.stderr).toBe(
      "error: waymark.yaml: ignore.0: " +
        "Only *, ?, and ** wildcard syntax is supported.\n" +
        "error: waymark.yaml: ignore.1: " +
        "Only *, ?, and ** wildcard syntax is supported.\n" +
        "error: waymark.yaml: ignore.2: " +
        "Only *, ?, and ** wildcard syntax is supported.\n",
    );
  },
);
