import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { expect } from "vitest";

import { integrationTest, runWaymark } from "../cli-test-fixture.js";

integrationTest(
  "ls lists direct Waymark Documents in the current or explicit directory",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const guidesPath = join(repositoryPath, "docs", "guides");
    await mkdir(guidesPath, { recursive: true });
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    const registeredDocument =
      "---\nkind: guide\ndescription: A guide\n---\n# Guide\n";
    await writeFile(
      join(repositoryPath, "docs", "overview.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(join(guidesPath, "nested.md"), registeredDocument, "utf8");
    await writeFile(
      join(repositoryPath, "docs", "README.md"),
      "# Unregistered\n",
      "utf8",
    );

    const currentDirectoryResult = runWaymark({
      arguments: ["ls"],
      workingDirectoryPath: join(repositoryPath, "docs"),
    });
    const explicitDirectoryResult = runWaymark({
      arguments: ["ls", "docs/guides"],
      workingDirectoryPath: repositoryPath,
    });

    expect(currentDirectoryResult.status).toBe(0);
    expect(currentDirectoryResult.stdout).toBe("docs/overview.md\n");
    expect(currentDirectoryResult.stderr).toBe("");
    expect(explicitDirectoryResult.status).toBe(0);
    expect(explicitDirectoryResult.stdout).toBe("docs/guides/nested.md\n");
    expect(explicitDirectoryResult.stderr).toBe("");
  },
);

integrationTest(
  "ls --unregistered lists only direct Unregistered Documents",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs"));
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: true\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "registered.md"),
      "---\n" +
        "waymark:\n" +
        "  kind: guide\n" +
        "  description: Registered\n" +
        "---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "flat-looking.mdx"),
      "---\nkind: guide\ndescription: Not namespaced\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "notes.md"),
      "# Notes\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["ls", "-u", "docs"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("docs/flat-looking.mdx\ndocs/notes.md\n");
    expect(result.stdout).not.toContain("registered.md");
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "ls recurses only with uppercase -R or --recursive",
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
    const registeredDocument = "---\nkind: guide\ndescription: A guide\n---\n";
    await writeFile(
      join(repositoryPath, "docs", "direct.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "nested", "child.md"),
      registeredDocument,
      "utf8",
    );

    const shortOptionResult = runWaymark({
      arguments: ["ls", "-R", "docs"],
      workingDirectoryPath: repositoryPath,
    });
    const longOptionResult = runWaymark({
      arguments: ["ls", "--recursive", "docs"],
      workingDirectoryPath: repositoryPath,
    });
    const lowercaseOptionResult = runWaymark({
      arguments: ["ls", "-r", "docs"],
      workingDirectoryPath: repositoryPath,
    });

    expect(shortOptionResult.status).toBe(0);
    expect(shortOptionResult.stdout).toBe(
      "docs/direct.md\ndocs/nested/child.md\n",
    );
    expect(shortOptionResult.stderr).toBe("");
    expect(longOptionResult.status).toBe(0);
    expect(longOptionResult.stdout).toBe(shortOptionResult.stdout);
    expect(longOptionResult.stderr).toBe("");
    expect(lowercaseOptionResult.status).toBe(1);
    expect(lowercaseOptionResult.stdout).toBe("");
    expect(lowercaseOptionResult.stderr).toContain("unknown option '-r'");
  },
);

integrationTest(
  "ls validates attempted registrations only within the selected scope",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs"));
    await mkdir(join(repositoryPath, "elsewhere"));
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "valid.md"),
      "---\nkind: guide\ndescription: Valid\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "elsewhere", "invalid.md"),
      "---\nkind: missing\ndescription: Outside scope\n---\n",
      "utf8",
    );

    const validScopeResult = runWaymark({
      arguments: ["ls", "docs"],
      workingDirectoryPath: repositoryPath,
    });

    expect(validScopeResult.status).toBe(0);
    expect(validScopeResult.stdout).toBe("docs/valid.md\n");
    expect(validScopeResult.stderr).toBe("");

    await writeFile(
      join(repositoryPath, "docs", "a-malformed.md"),
      "---\nwaymark: [unterminated\n---\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "b-invalid.md"),
      "---\nkind: missing\ndescription: Invalid\n---\n",
      "utf8",
    );

    const invalidScopeResult = runWaymark({
      arguments: ["ls", "--unregistered", "docs"],
      workingDirectoryPath: repositoryPath,
    });

    expect(invalidScopeResult.status).toBe(1);
    expect(invalidScopeResult.stdout).toBe("");
    expect(invalidScopeResult.stderr).toBe(
      "error: docs/a-malformed.md: frontmatter: Malformed YAML frontmatter.\n" +
        'error: docs/b-invalid.md: kind: Undeclared kind "missing".\n',
    );
  },
);

integrationTest(
  "recursive inventory honors configured ignore patterns and deterministic paths",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "docs", "nested"), { recursive: true });
    await mkdir(join(repositoryPath, "docs", "ignored"));
    await mkdir(join(repositoryPath, "docs", "generated"));
    await mkdir(join(repositoryPath, "docs", ".git"));
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\n" +
        "kinds:\n" +
        "  guide: Guides\n" +
        "tags: {}\n" +
        "ignore:\n" +
        "  - docs/generated/**\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, ".gitignore"),
      "docs/ignored/\n",
      "utf8",
    );
    const registeredDocument = "---\nkind: guide\ndescription: A guide\n---\n";
    await writeFile(
      join(repositoryPath, "docs", "z-last.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "a-first.mdx"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "ignored", "ignored.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "generated", "generated.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", ".git", "internal.md"),
      registeredDocument,
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "nested", "notes.md"),
      "# Unregistered\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "docs", "nested", "notes.markdown"),
      "# Unsupported extension\n",
      "utf8",
    );
    await symlink(
      join(repositoryPath, "docs", "nested"),
      join(repositoryPath, "docs", "linked-directory"),
      "dir",
    );
    await symlink(
      join(repositoryPath, "docs", "z-last.md"),
      join(repositoryPath, "docs", "linked-file.md"),
      "file",
    );

    const registeredResult = runWaymark({
      arguments: ["ls", "-R", "docs"],
      workingDirectoryPath: repositoryPath,
    });
    const unregisteredResult = runWaymark({
      arguments: ["ls", "-R", "--unregistered", "docs"],
      workingDirectoryPath: repositoryPath,
    });

    expect(registeredResult.status).toBe(0);
    expect(registeredResult.stdout).toBe("docs/a-first.mdx\ndocs/z-last.md\n");
    expect(registeredResult.stderr).toBe("");
    expect(unregisteredResult.status).toBe(0);
    expect(unregisteredResult.stdout).toBe("docs/nested/notes.md\n");
    expect(unregisteredResult.stderr).toBe("");
  },
);

integrationTest(
  "ls succeeds with empty registered and unregistered populations",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await mkdir(join(repositoryPath, "empty"));
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\nkinds: {}\ntags: {}\n",
      "utf8",
    );

    const registeredResult = runWaymark({
      arguments: ["ls", "empty"],
      workingDirectoryPath: repositoryPath,
    });
    const unregisteredResult = runWaymark({
      arguments: ["ls", "--unregistered", "empty"],
      workingDirectoryPath: repositoryPath,
    });

    expect(registeredResult.status).toBe(0);
    expect(registeredResult.stdout).toBe("");
    expect(registeredResult.stderr).toBe("");
    expect(unregisteredResult.status).toBe(0);
    expect(unregisteredResult.stdout).toBe("");
    expect(unregisteredResult.stderr).toBe("");
  },
);

integrationTest(
  "ls rejects missing, non-directory, and outside-root operands",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeFile(
      join(repositoryPath, "waymark.yaml"),
      "require-namespace: false\nkinds: {}\ntags: {}\n",
      "utf8",
    );
    await writeFile(
      join(repositoryPath, "document.md"),
      "# Document\n",
      "utf8",
    );

    const missingResult = runWaymark({
      arguments: ["ls", "missing"],
      workingDirectoryPath: repositoryPath,
    });
    const fileResult = runWaymark({
      arguments: ["ls", "document.md"],
      workingDirectoryPath: repositoryPath,
    });
    const outsideResult = runWaymark({
      arguments: ["ls", dirname(repositoryPath)],
      workingDirectoryPath: repositoryPath,
    });

    const canonicalRepositoryPath = await realpath(repositoryPath);
    expect(missingResult.status).toBe(1);
    expect(missingResult.stdout).toBe("");
    expect(missingResult.stderr).toBe(
      `error: Directory does not exist: ${join(canonicalRepositoryPath, "missing")}\n`,
    );
    expect(fileResult.status).toBe(1);
    expect(fileResult.stdout).toBe("");
    expect(fileResult.stderr).toBe(
      `error: Not a directory: ${join(canonicalRepositoryPath, "document.md")}\n`,
    );
    expect(outsideResult.status).toBe(1);
    expect(outsideResult.stdout).toBe("");
    expect(outsideResult.stderr).toBe(
      `error: Directory is outside the configuration root: ${dirname(repositoryPath)}\n`,
    );
  },
);
