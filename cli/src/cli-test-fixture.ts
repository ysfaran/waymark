import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { test } from "vitest";

const tsxLoaderPath = fileURLToPath(import.meta.resolve("tsx"));
const waymarkCliPath = fileURLToPath(new URL("cli.ts", import.meta.url));

export const integrationTest = test.extend<{
  temporaryRepositoryPath: string;
}>({
  temporaryRepositoryPath: async ({ onTestFinished }, use) => {
    const repositoryPath = await mkdtemp(join(tmpdir(), "waymark-"));

    onTestFinished(async () => {
      await rm(repositoryPath, { force: true, recursive: true });
    });

    await use(repositoryPath);
  },
});

export function runWaymark({
  arguments: cliArguments,
  workingDirectoryPath,
}: {
  arguments: string[];
  workingDirectoryPath: string;
}): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    ["--import", tsxLoaderPath, waymarkCliPath, ...cliArguments],
    {
      cwd: workingDirectoryPath,
      encoding: "utf8",
      input: "",
      timeout: 1_000,
    },
  );
}
