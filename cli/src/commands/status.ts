import { Command } from "commander";

import {
  loadConfiguration,
  type ConfigurationDeclaration,
} from "../configuration/index.js";
import { compareDiagnostics, throwDiagnostics } from "../diagnostics.js";
import { scanDocuments } from "../documents/index.js";

export function createStatusCommand(): Command {
  return new Command("status")
    .description("Validate and summarize the Waymark repository")
    .option(
      "-s, --show <fields>",
      "Show declared kind and tag details (kind,tags)",
    )
    .action(async (options: { show?: string }) => {
      const shownFields = parseShownFields(options.show);
      const loadedConfiguration = await loadConfiguration(process.cwd());

      if (loadedConfiguration.kind === "malformed") {
        process.stdout.write(
          `Root: ${loadedConfiguration.rootPath}\n` + "Status: invalid\n",
        );
        throwDiagnostics(loadedConfiguration.diagnostics);
      }

      const { configuration, rootPath } = loadedConfiguration;
      const documentScan = await scanDocuments({ rootPath, configuration });
      const diagnostics = [
        ...loadedConfiguration.diagnostics,
        ...(documentScan.kind === "invalid" ? documentScan.diagnostics : []),
      ].sort(compareDiagnostics);
      if (
        loadedConfiguration.diagnostics.length > 0 ||
        documentScan.kind === "invalid"
      ) {
        process.stdout.write(`Root: ${rootPath}\n` + "Status: invalid\n");
        throwDiagnostics(diagnostics);
      }

      let output =
        `Root: ${rootPath}\n` +
        "Status: valid\n" +
        `Waymark Documents: ${documentScan.documents.length}\n` +
        `Unregistered Documents: ${documentScan.unregisteredDocuments.length}\n` +
        `Kinds: ${configuration.kinds.size}\n` +
        `Tags: ${configuration.tags.size}\n`;

      if (shownFields.size > 0) output += "\n";
      if (shownFields.has("kind")) {
        output += renderDeclaredValues(
          "Kinds",
          configuration.kinds,
          documentScan.kindUsageCounts,
        );
      }
      if (shownFields.has("tags")) {
        output += renderDeclaredValues(
          "Tags",
          configuration.tags,
          documentScan.tagUsageCounts,
        );
      }

      process.stdout.write(output);
    });
}

function parseShownFields(value: string | undefined): Set<"kind" | "tags"> {
  if (value === undefined) return new Set();

  const fields = value.split(",");
  const shownFields = new Set<"kind" | "tags">();
  for (const field of fields) {
    if (field !== "kind" && field !== "tags") {
      throw new Error(
        `Unknown status field "${field}". Expected kind or tags.`,
      );
    }
    if (shownFields.has(field)) {
      throw new Error(`Duplicate status field "${field}".`);
    }
    shownFields.add(field);
  }
  return shownFields;
}

function renderDeclaredValues(
  heading: string,
  values: Map<string, ConfigurationDeclaration>,
  usageCounts: Map<string, number>,
): string {
  let output = `${heading}:\n`;
  const sortedValues = [...values.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  for (const [identifier, value] of sortedValues) {
    const documentCount = usageCounts.get(identifier) ?? 0;
    const noun = documentCount === 1 ? "document" : "documents";
    const description = value.description.replaceAll(/\s+/g, " ").trim();
    output +=
      `  ${identifier} — ${description} ` + `(${documentCount} ${noun})\n`;
  }
  return output;
}
