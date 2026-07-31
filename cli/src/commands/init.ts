import { basename } from "node:path";

import { Command } from "commander";

import { initializeConfiguration } from "../configuration/index.js";

export function createInitCommand(): Command {
  return new Command("init")
    .description("Create a starter Waymark configuration")
    .action(async () => {
      const { configurationPath } = await initializeConfiguration(
        process.cwd(),
      );

      process.stdout.write(`Created ${basename(configurationPath)}\n`);
    });
}
