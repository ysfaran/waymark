#!/usr/bin/env node

import { CommanderError, Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { createFindCommand } from "./commands/find.js";
import { createInitCommand } from "./commands/init.js";
import { createLsCommand } from "./commands/ls.js";
import { createStatusCommand } from "./commands/status.js";

const program = new Command()
  .name("waymark")
  .description("Discover repository documentation deterministically")
  .version(packageJson.version)
  .exitOverride();

program.addCommand(createInitCommand());
program.addCommand(createStatusCommand());
program.addCommand(createFindCommand());
program.addCommand(createLsCommand());

try {
  await program.parseAsync();
} catch (error: unknown) {
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`error: ${message}\n`);
    process.exitCode = 1;
  }
}
