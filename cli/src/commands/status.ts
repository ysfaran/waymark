import { Command } from "commander";

import { loadConfiguration } from "../configuration/index.js";
import { compareDiagnostics, throwDiagnostics } from "../diagnostics.js";
import { scanDocuments } from "../documents/index.js";

export function createStatusCommand(): Command {
  return new Command("status")
    .description("Validate and summarize the Waymark repository")
    .action(async () => {
      const loadedConfiguration = await loadConfiguration(process.cwd());

      if (loadedConfiguration.kind === "invalid") {
        process.stdout.write(
          `Root: ${loadedConfiguration.rootPath}\n` + "Status: invalid\n",
        );
        throwDiagnostics(loadedConfiguration.diagnostics);
      }

      const { configuration, rootPath } = loadedConfiguration;
      const documentScan = await scanDocuments({ rootPath, configuration });
      if (documentScan.kind === "invalid") {
        process.stdout.write(`Root: ${rootPath}\n` + "Status: invalid\n");
        throwDiagnostics(documentScan.diagnostics.sort(compareDiagnostics));
      }

      const output =
        `Root: ${rootPath}\n` +
        "Status: valid\n" +
        `Waymark Documents: ${documentScan.documents.length}\n` +
        `Unregistered Documents: ${documentScan.unregisteredDocuments.length}\n` +
        `Scopes: ${configuration.scopes.size}\n` +
        `Kinds: ${configuration.kinds.size}\n` +
        `Tags: ${configuration.tags.size}\n`;

      process.stdout.write(output);
    });
}
