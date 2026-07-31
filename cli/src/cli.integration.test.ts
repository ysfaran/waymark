import { readdir } from "node:fs/promises";

import { expect } from "vitest";

import packageJson from "../package.json" with { type: "json" };
import { integrationTest, runWaymark } from "./cli-test-fixture.js";

integrationTest(
  "--help reports CLI information without repository work",
  async ({ temporaryRepositoryPath }) => {
    const result = runWaymark({
      arguments: ["--help"],
      workingDirectoryPath: temporaryRepositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      "Usage: waymark [options] [command]\n" +
        "\n" +
        "Discover repository documentation deterministically\n" +
        "\n" +
        "Options:\n" +
        "  -V, --version             output the version number\n" +
        "  -h, --help                display help for command\n" +
        "\n" +
        "Commands:\n" +
        "  init                      Create a starter Waymark configuration\n" +
        "  status [options]          Validate and summarize the Waymark repository\n" +
        "  find [options]            Discover Waymark Documents\n" +
        "  ls [options] [directory]  Inventory document registration in a directory\n" +
        "  help [command]            display help for command\n",
    );
    expect(result.stderr).toBe("");
    await expect(readdir(temporaryRepositoryPath)).resolves.toEqual([]);
  },
);

integrationTest(
  "--version reports CLI information without repository work",
  async ({ temporaryRepositoryPath }) => {
    const result = runWaymark({
      arguments: ["--version"],
      workingDirectoryPath: temporaryRepositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${packageJson.version}\n`);
    expect(result.stderr).toBe("");
    await expect(readdir(temporaryRepositoryPath)).resolves.toEqual([]);
  },
);
