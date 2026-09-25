import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { integrationTest, runWaymark } from "../cli-test-fixture.js";

integrationTest(
  "find returns every Waymark Document in path order by default",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs"));
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "z-last.md"),
      "---\nkind: guide\ndescription: Last guide\n---\n# Last\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "first.mdx"),
      "---\nkind: adr\ndescription: First decision\n---\n# First\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "README.md"),
      "# Unregistered\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["find"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      "docs/first.mdx [] [adr] [] — First decision\n" +
        "z-last.md [] [guide] [] — Last guide\n",
    );
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "find combines simple filter groups with the documented AND and OR algebra",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  convention: Conventions\n" +
        "  research: Research\n" +
        "tags:\n" +
        "  backend: Backend\n" +
        "  other: Other\n" +
        "  react: React\n" +
        "  review: Review\n" +
        "  typescript: TypeScript\n",
      "utf8",
    );

    const documents = [
      ["a.md", "adr", "[react, review, typescript]"],
      ["b.md", "convention", "[backend, review, typescript]"],
      ["c.md", "research", "[react, review, typescript]"],
      ["d.md", "adr", "[react, review]"],
      ["e.md", "adr", "[other, review, typescript]"],
    ] as const;
    for (const [path, kind, tags] of documents) {
      await writeFile(
        join(repositoryPath, path),
        `---\nkind: ${kind}\ndescription: ${path}\ntags: ${tags}\n---\n`,
        "utf8",
      );
    }

    const result = runWaymark({
      arguments: [
        "find",
        "--kinds",
        "adr,convention",
        "--tags",
        "react,backend",
        "--require-tags",
        "review,typescript",
      ],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      "a.md [] [adr] [react,review,typescript] — a.md\n" +
        "b.md [] [convention] [backend,review,typescript] — b.md\n",
    );
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "find matches any selected scope and combines scopes with other simple filters using AND",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "scopes:\n" +
        "  backend: Backend\n" +
        "  search-service: Search service\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    const documents = [
      ["a.md", "adr", "[backend]"],
      ["b.md", "guide", "[search-service]"],
      ["c.md", "guide", "[]"],
      ["d.md", "guide", "[backend, search-service]"],
    ] as const;
    for (const [path, kind, scopes] of documents) {
      await writeFile(
        join(repositoryPath, path),
        `---\nkind: ${kind}\ndescription: ${path}\nscopes: ${scopes}\n---\n`,
        "utf8",
      );
    }

    const scopesResult = runWaymark({
      arguments: ["find", "--scopes", "backend,search-service"],
      workingDirectoryPath: repositoryPath,
    });
    const combinedResult = runWaymark({
      arguments: ["find", "--scopes", "backend", "--kinds", "guide"],
      workingDirectoryPath: repositoryPath,
    });
    const unfilteredResult = runWaymark({
      arguments: ["find"],
      workingDirectoryPath: repositoryPath,
    });

    expect(scopesResult.status).toBe(0);
    expect(scopesResult.stdout).toBe(
      "a.md [backend] [adr] [] — a.md\n" +
        "b.md [search-service] [guide] [] — b.md\n" +
        "d.md [backend,search-service] [guide] [] — d.md\n",
    );
    expect(scopesResult.stderr).toBe("");
    expect(combinedResult.status).toBe(0);
    expect(combinedResult.stdout).toBe(
      "d.md [backend,search-service] [guide] [] — d.md\n",
    );
    expect(combinedResult.stderr).toBe("");
    expect(unfilteredResult.status).toBe(0);
    expect(unfilteredResult.stdout).toBe(
      "a.md [backend] [adr] [] — a.md\n" +
        "b.md [search-service] [guide] [] — b.md\n" +
        "c.md [] [guide] [] — c.md\n" +
        "d.md [backend,search-service] [guide] [] — d.md\n",
    );
  },
);

integrationTest(
  "find evaluates an advanced Boolean Metadata Filter",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  convention: Conventions\n" +
        "tags:\n" +
        "  react: React\n" +
        "  typescript: TypeScript\n",
      "utf8",
    );
    const documents = [
      ["a.md", "adr", "[react]"],
      ["b.md", "convention", "[react, typescript]"],
      ["c.md", "adr", "[typescript]"],
    ] as const;
    for (const [path, kind, tags] of documents) {
      await writeFile(
        join(repositoryPath, path),
        `---\nkind: ${kind}\ndescription: ${path}\ntags: ${tags}\n---\n`,
        "utf8",
      );
    }

    const result = runWaymark({
      arguments: [
        "find",
        "--filter",
        "(kind:adr OR kind:convention) AND tag:react",
      ],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      "a.md [] [adr] [react] — a.md\n" +
        "b.md [] [convention] [react,typescript] — b.md\n",
    );
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "find evaluates Document Scope predicates in an advanced Boolean Metadata Filter",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "scopes:\n" +
        "  backend: Backend\n" +
        "  search-service: Search service\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "backend.md"),
      "---\nkind: guide\ndescription: Backend\nscopes: [backend]\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "both.md"),
      "---\n" +
        "kind: guide\n" +
        "description: Both\n" +
        "scopes: [backend, search-service]\n" +
        "---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: [
        "find",
        "--filter",
        "scope:backend AND NOT scope:search-service",
      ],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("backend.md [backend] [guide] [] — Backend\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "find applies a literal case-insensitive Content Query to document bodies only",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "frontmatter-only.md"),
      "---\nkind: guide\ndescription: Contains NEEDLE! here\n---\n# Other\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "matching.md"),
      "---\nkind: guide\ndescription: Matching body\n---\n# A needle!\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "wrong-kind.mdx"),
      "---\nkind: adr\ndescription: Wrong kind\n---\n<Note>A needle!</Note>\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "matching.mdx"),
      "---\nkind: guide\ndescription: Matching MDX body\n---\n<Note>A needle!</Note>\n",
      "utf8",
    );

    const simpleFilterResult = runWaymark({
      arguments: ["find", "--kinds", "guide", "--query", "NeEdLe!"],
      workingDirectoryPath: repositoryPath,
    });
    const advancedFilterResult = runWaymark({
      arguments: ["find", "--filter", "kind:adr", "--query", "NeEdLe!"],
      workingDirectoryPath: repositoryPath,
    });

    expect(simpleFilterResult.status).toBe(0);
    expect(simpleFilterResult.stdout).toBe(
      "matching.md [] [guide] [] — Matching body\n" +
        "matching.mdx [] [guide] [] — Matching MDX body\n",
    );
    expect(simpleFilterResult.stderr).toBe("");
    expect(advancedFilterResult.status).toBe(0);
    expect(advancedFilterResult.stdout).toBe(
      "wrong-kind.mdx [] [adr] [] — Wrong kind\n",
    );
    expect(advancedFilterResult.stderr).toBe("");
  },
);

integrationTest(
  "find --show renders every text projection in canonical field order",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "scopes:\n" +
        "  backend: Backend\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n" +
        "  typescript: TypeScript\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "guide.md"),
      "---\n" +
        "kind: guide\n" +
        "description: >\n" +
        "  First line\n" +
        "  second line\n" +
        "scopes: [backend]\n" +
        "tags: [typescript, react]\n" +
        "---\n",
      "utf8",
    );

    const projections = [
      ["scopes", "guide.md [backend]\n"],
      ["kind", "guide.md [guide]\n"],
      ["tags", "guide.md [typescript,react]\n"],
      ["description", "guide.md — First line second line\n"],
      ["kind,tags", "guide.md [guide] [typescript,react]\n"],
      ["kind,description", "guide.md [guide] — First line second line\n"],
      [
        "tags,description",
        "guide.md [typescript,react] — First line second line\n",
      ],
      [
        "description,tags,kind,scopes",
        "guide.md [backend] [guide] [typescript,react] — First line second line\n",
      ],
    ] as const;

    for (const [show, expectedOutput] of projections) {
      const result = runWaymark({
        arguments: ["find", "--show", show],
        workingDirectoryPath: repositoryPath,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe(expectedOutput);
      expect(result.stderr).toBe("");
    }
  },
);

integrationTest(
  "find --json returns a flat path-ordered projection with raw descriptions",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "scopes:\n" +
        "  backend: Backend\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "z.md"),
      "---\nkind: guide\ndescription: Last\nscopes: [backend]\ntags: [react]\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "a.md"),
      "---\n" +
        "kind: guide\n" +
        "description: |\n" +
        "  First\n" +
        "  second\n" +
        "tags: []\n" +
        "---\n",
      "utf8",
    );

    const defaultResult = runWaymark({
      arguments: ["find", "--json"],
      workingDirectoryPath: repositoryPath,
    });
    const limitedResult = runWaymark({
      arguments: ["find", "--json", "--show", "description,kind,scopes"],
      workingDirectoryPath: repositoryPath,
    });

    expect(defaultResult.status).toBe(0);
    expect(JSON.parse(defaultResult.stdout)).toEqual([
      {
        path: "a.md",
        scopes: [],
        kind: "guide",
        tags: [],
        description: "First\nsecond\n",
      },
      {
        path: "z.md",
        scopes: ["backend"],
        kind: "guide",
        tags: ["react"],
        description: "Last",
      },
    ]);
    expect(defaultResult.stderr).toBe("");
    expect(limitedResult.status).toBe(0);
    expect(JSON.parse(limitedResult.stdout)).toEqual([
      {
        path: "a.md",
        scopes: [],
        kind: "guide",
        description: "First\nsecond\n",
      },
      {
        path: "z.md",
        scopes: ["backend"],
        kind: "guide",
        description: "Last",
      },
    ]);
    expect(limitedResult.stderr).toBe("");
  },
);

integrationTest(
  "find --tree renders a deterministic directory tree with projections",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs", "nested"), { recursive: true });
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    const documentSource = "---\nkind: guide\ndescription: A guide\n---\n";
    await writeFile(join(repositoryPath, "root.md"), documentSource, "utf8");
    await writeFile(join(repositoryPath, "docs.md"), documentSource, "utf8");
    await writeFile(
      join(repositoryPath, "docs", "a.md"),
      documentSource,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "nested", "b.md"),
      documentSource,
      "utf8",
    );

    const defaultResult = runWaymark({
      arguments: ["find", "--tree"],
      workingDirectoryPath: repositoryPath,
    });
    const limitedResult = runWaymark({
      arguments: ["find", "--tree", "--show", "kind"],
      workingDirectoryPath: repositoryPath,
    });

    expect(defaultResult.status).toBe(0);
    expect(defaultResult.stdout).toBe(
      "docs.md [] [guide] [] — A guide\n" +
        "docs/\n" +
        "├── a.md [] [guide] [] — A guide\n" +
        "└── nested/\n" +
        "    └── b.md [] [guide] [] — A guide\n" +
        "root.md [] [guide] [] — A guide\n",
    );
    expect(defaultResult.stderr).toBe("");
    expect(limitedResult.status).toBe(0);
    expect(limitedResult.stdout).toBe(
      "docs.md [guide]\n" +
        "docs/\n" +
        "├── a.md [guide]\n" +
        "└── nested/\n" +
        "    └── b.md [guide]\n" +
        "root.md [guide]\n",
    );
    expect(limitedResult.stderr).toBe("");
  },
);

integrationTest(
  "find applies each simple filter and flattens repeated values identically",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  adr: Architecture decisions\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n" +
        "  review: Review\n" +
        "  typescript: TypeScript\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "adr.md"),
      "---\n" +
        "kind: adr\n" +
        "description: Decision\n" +
        "tags: [react, review, typescript]\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "guide.md"),
      "---\n" +
        "kind: guide\n" +
        "description: Guide\n" +
        "tags: [typescript]\n" +
        "---\n",
      "utf8",
    );

    const kindsResult = runWaymark({
      arguments: ["find", "--kinds", "adr,guide"],
      workingDirectoryPath: repositoryPath,
    });
    const repeatedKindsResult = runWaymark({
      arguments: ["find", "--kinds", "adr", "--kinds", "guide"],
      workingDirectoryPath: repositoryPath,
    });
    const tagsResult = runWaymark({
      arguments: ["find", "--tags", "react,typescript"],
      workingDirectoryPath: repositoryPath,
    });
    const repeatedTagsResult = runWaymark({
      arguments: ["find", "--tags", "react", "--tags", "typescript"],
      workingDirectoryPath: repositoryPath,
    });
    const requiredTagsResult = runWaymark({
      arguments: ["find", "--require-tags", "review,typescript"],
      workingDirectoryPath: repositoryPath,
    });
    const repeatedRequiredTagsResult = runWaymark({
      arguments: [
        "find",
        "--require-tags",
        "review",
        "--require-tags",
        "typescript",
      ],
      workingDirectoryPath: repositoryPath,
    });

    expect(kindsResult.status).toBe(0);
    expect(kindsResult.stdout).toBe(
      "adr.md [] [adr] [react,review,typescript] — Decision\n" +
        "guide.md [] [guide] [typescript] — Guide\n",
    );
    expect(kindsResult.stderr).toBe("");
    expect(repeatedKindsResult.status).toBe(0);
    expect(repeatedKindsResult.stdout).toBe(kindsResult.stdout);
    expect(repeatedKindsResult.stderr).toBe("");
    expect(tagsResult.status).toBe(0);
    expect(tagsResult.stdout).toBe(
      "adr.md [] [adr] [react,review,typescript] — Decision\n" +
        "guide.md [] [guide] [typescript] — Guide\n",
    );
    expect(tagsResult.stderr).toBe("");
    expect(repeatedTagsResult.status).toBe(0);
    expect(repeatedTagsResult.stdout).toBe(tagsResult.stdout);
    expect(repeatedTagsResult.stderr).toBe("");
    expect(requiredTagsResult.status).toBe(0);
    expect(requiredTagsResult.stdout).toBe(
      "adr.md [] [adr] [react,review,typescript] — Decision\n",
    );
    expect(requiredTagsResult.stderr).toBe("");
    expect(repeatedRequiredTagsResult.status).toBe(0);
    expect(repeatedRequiredTagsResult.stdout).toBe(requiredTagsResult.stdout);
    expect(repeatedRequiredTagsResult.stderr).toBe("");
  },
);

integrationTest(
  "find rejects empty, duplicate, and undeclared simple filter values",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n",
      "utf8",
    );

    const invalidFilters = [
      [["--kinds", ""], "--kinds contains an empty identifier."],
      [
        ["--tags", "react", "--tags", "react"],
        '--tags contains duplicate identifier "react".',
      ],
      [
        ["--require-tags", "missing"],
        '--require-tags contains undeclared tag "missing".',
      ],
    ] as const;
    for (const [argumentsAfterFind, expectedMessage] of invalidFilters) {
      const result = runWaymark({
        arguments: ["find", ...argumentsAfterFind],
        workingDirectoryPath: repositoryPath,
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(`error: ${expectedMessage}\n`);
    }
  },
);

integrationTest(
  "find rejects incompatible filter and output options",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const filterResult = runWaymark({
      arguments: ["find", "--filter", "kind:guide", "--scopes", "backend"],
      workingDirectoryPath: repositoryPath,
    });
    const outputResult = runWaymark({
      arguments: ["find", "--json", "--tree"],
      workingDirectoryPath: repositoryPath,
    });

    expect(filterResult.status).toBe(1);
    expect(filterResult.stdout).toBe("");
    expect(filterResult.stderr).toBe(
      "error: --filter cannot be combined with --scopes, --kinds, --tags, or --require-tags.\n",
    );
    expect(outputResult.status).toBe(1);
    expect(outputResult.stdout).toBe("");
    expect(outputResult.stderr).toBe(
      "error: --json cannot be combined with --tree.\n",
    );
  },
);

integrationTest(
  "find emits no partial results when repository validation fails",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "a-invalid.md"),
      "---\nkind: missing\ndescription: Invalid\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "z-valid.md"),
      "---\nkind: guide\ndescription: Valid\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["find"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      'error: a-invalid.md: kind: Undeclared kind "missing".\n',
    );
  },
);

integrationTest(
  "find treats zero text and JSON matches as successful",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );

    const textResult = runWaymark({
      arguments: ["find", "--kinds", "guide"],
      workingDirectoryPath: repositoryPath,
    });
    const jsonResult = runWaymark({
      arguments: ["find", "--kinds", "guide", "--json"],
      workingDirectoryPath: repositoryPath,
    });

    expect(textResult.status).toBe(0);
    expect(textResult.stdout).toBe("");
    expect(textResult.stderr).toBe("");
    expect(jsonResult.status).toBe(0);
    expect(jsonResult.stdout).toBe("[]\n");
    expect(jsonResult.stderr).toBe("");
  },
);

integrationTest(
  "find renders requested empty tags explicitly",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\nkinds:\n  guide: Guides\ntags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "guide.md"),
      "---\nkind: guide\ndescription: Guide\ntags: []\n---\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["find", "--show", "tags"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("guide.md []\n");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "find reports malformed advanced filters without result output",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["find", "--filter", "kind:guide tag:react"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "error: Metadata Filter syntax error at position 12: " +
        "Expected AND or OR before this token.\n",
    );
  },
);

integrationTest(
  "find supports documented shorthand options and rejects removed aliases",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags:\n" +
        "  react: React\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "guide.md"),
      "---\n" +
        "kind: guide\n" +
        "description: Guide\n" +
        "tags: [react]\n" +
        "---\n" +
        "# Dependency injection\n",
      "utf8",
    );

    const jsonResult = runWaymark({
      arguments: [
        "find",
        "-k",
        "guide",
        "-t",
        "react",
        "-T",
        "react",
        "-q",
        "dependency injection",
        "-s",
        "kind,tags",
        "--json",
      ],
      workingDirectoryPath: repositoryPath,
    });
    const treeResult = runWaymark({
      arguments: ["find", "-f", "kind:guide AND tag:react", "--tree"],
      workingDirectoryPath: repositoryPath,
    });
    const removedJsonShorthandResult = runWaymark({
      arguments: ["find", "-j"],
      workingDirectoryPath: repositoryPath,
    });
    const removedRequireTagsShorthandResult = runWaymark({
      arguments: ["find", "-r", "react"],
      workingDirectoryPath: repositoryPath,
    });

    expect(jsonResult.status).toBe(0);
    expect(JSON.parse(jsonResult.stdout)).toEqual([
      { path: "guide.md", kind: "guide", tags: ["react"] },
    ]);
    expect(jsonResult.stderr).toBe("");
    expect(treeResult.status).toBe(0);
    expect(treeResult.stdout).toBe("guide.md [] [guide] [react] — Guide\n");
    expect(treeResult.stderr).toBe("");
    expect(removedJsonShorthandResult.status).toBe(1);
    expect(removedJsonShorthandResult.stdout).toBe("");
    expect(removedJsonShorthandResult.stderr).toContain("unknown option '-j'");
    expect(removedRequireTagsShorthandResult.status).toBe(1);
    expect(removedRequireTagsShorthandResult.stdout).toBe("");
    expect(removedRequireTagsShorthandResult.stderr).toContain(
      "unknown option '-r'",
    );
  },
);
