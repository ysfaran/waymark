import {
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { integrationTest, runWaymark } from "../cli-test-fixture.js";

integrationTest(
  "init creates a starter Waymark configuration",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const guidePath = join(repositoryPath, "docs", "guide.mdx");
    const readmePath = join(repositoryPath, "README.md");

    await mkdir(join(repositoryPath, "docs"));
    await writeFile(guidePath, "# Guide\n", "utf8");
    await writeFile(readmePath, "# Repository\n", "utf8");

    const result = runWaymark({
      arguments: ["init"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("Created waymark.yml\n");
    expect(result.stderr).toBe("");
    await expect(
      readFile(join(repositoryPath, "waymark.yml"), "utf8"),
    ).resolves.toBe(
      "# When true, document metadata must be nested under a `waymark` frontmatter key.\n" +
        "require-namespace: false\n" +
        "kinds:\n" +
        "  example-kind: Explain when agents should read this kind of document\n" +
        "tags:\n" +
        "  example-tag: Explain the topic represented by this tag\n",
    );
    await expect(readFile(guidePath, "utf8")).resolves.toBe("# Guide\n");
    await expect(readFile(readmePath, "utf8")).resolves.toBe("# Repository\n");
    const repositoryEntries = await readdir(repositoryPath, {
      recursive: true,
    });
    expect(repositoryEntries.sort()).toEqual([
      "README.md",
      "docs",
      "docs/guide.mdx",
      "waymark.yml",
    ]);
  },
);

integrationTest(
  "init refuses to overwrite an existing Waymark configuration",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const configurationPath = join(repositoryPath, "waymark.yml");
    const existingConfiguration =
      "require-namespace: true\nkinds:\n  adr: Decisions\n";

    await writeFile(configurationPath, existingConfiguration, "utf8");

    const result = runWaymark({
      arguments: ["init"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const canonicalConfigurationPath = join(
      await realpath(repositoryPath),
      "waymark.yml",
    );
    expect(result.stderr).toBe(
      "error: A Waymark configuration already exists at " +
        `${canonicalConfigurationPath}.\n`,
    );
    await expect(readFile(configurationPath, "utf8")).resolves.toBe(
      existingConfiguration,
    );
  },
);

integrationTest(
  "init refuses to create a nested Waymark configuration",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    const configurationPath = join(repositoryPath, "waymark.yaml");
    const nestedPath = join(repositoryPath, "packages", "example");

    await mkdir(nestedPath, { recursive: true });
    await writeFile(
      configurationPath,
      "require-namespace: false\nkinds: {}\ntags: {}\n",
      "utf8",
    );

    const result = runWaymark({
      arguments: ["init"],
      workingDirectoryPath: nestedPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const canonicalConfigurationPath = join(
      await realpath(repositoryPath),
      "waymark.yaml",
    );
    expect(result.stderr).toBe(
      "error: Cannot create a nested Waymark configuration because one " +
        `already exists at ${canonicalConfigurationPath}.\n`,
    );
    await expect(
      readFile(join(nestedPath, "waymark.yml"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  },
);
