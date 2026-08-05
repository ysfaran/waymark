import { resolve } from "node:path";

import { Command } from "commander";

import { loadConfiguration } from "../configuration/index.js";
import { throwDiagnostics } from "../diagnostics.js";
import { scanDocuments } from "../documents/index.js";

type LsOptions = {
  recursive?: boolean;
  unregistered?: boolean;
};

export function createLsCommand(): Command {
  return new Command("ls")
    .description("Inventory document registration in a directory")
    .argument("[directory]", "Directory to inspect")
    .option("-R, --recursive", "Inspect directories recursively")
    .option("-u, --unregistered", "List only Unregistered Documents")
    .action(async (directory: string | undefined, options: LsOptions) => {
      const loadedConfiguration = await loadConfiguration(process.cwd());
      if (loadedConfiguration.kind === "invalid") {
        throwDiagnostics(loadedConfiguration.diagnostics);
      }

      const rootPath = loadedConfiguration.rootPath;
      const documentScan = await scanDocuments({
        rootPath,
        configuration: loadedConfiguration.configuration,
        scope: {
          directoryPath: resolve(process.cwd(), directory ?? "."),
          recursive: options.recursive === true,
        },
      });
      if (documentScan.kind === "invalid") {
        throwDiagnostics(documentScan.diagnostics);
      }

      const paths = options.unregistered
        ? documentScan.unregisteredDocuments
        : documentScan.documents.map((document) => document.path);
      const output = paths.join("\n");
      if (output !== "") process.stdout.write(`${output}\n`);
    });
}
