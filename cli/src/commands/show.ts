import { Argument, Command } from "commander";

import {
  loadConfiguration,
  type ConfigurationDeclaration,
} from "../configuration/index.js";
import { throwDiagnostics } from "../diagnostics.js";
import { scanDocuments, type WaymarkDocument } from "../documents/index.js";
import {
  createUsageCounts,
  incrementUsageCount,
} from "../documents/usage-counts.js";
import {
  collectOptionValue,
  parseIdentifierOptions,
} from "./metadata-options.js";

type ShowCategory = "scopes" | "kinds" | "tags";

type ShowOptions = {
  scopes?: string[];
};

export function createShowCommand(): Command {
  return new Command("show")
    .description("List declared scopes, kinds, and tags")
    .addArgument(
      new Argument("[category]", "list only scopes, kinds, or tags").choices([
        "scopes",
        "kinds",
        "tags",
      ]),
    )
    .option(
      "--scopes <identifiers>",
      "select documents matching any scope (comma-separated, repeatable)",
      collectOptionValue,
    )
    .action(
      async (category: ShowCategory | undefined, options: ShowOptions) => {
        const loadedConfiguration = await loadConfiguration(process.cwd());
        if (loadedConfiguration.kind === "invalid") {
          throwDiagnostics(loadedConfiguration.diagnostics);
        }

        const { configuration, rootPath } = loadedConfiguration;
        const selectedScopes = parseIdentifierOptions({
          optionName: "--scopes",
          values: options.scopes ?? [],
          declarations: configuration.scopes,
          declarationName: "scope",
        });
        const documentScan = await scanDocuments({ rootPath, configuration });
        if (documentScan.kind === "invalid") {
          throwDiagnostics(documentScan.diagnostics);
        }

        const categories: ShowCategory[] = category
          ? [category]
          : ["scopes", "kinds", "tags"];
        const selectedDocuments = selectDocumentsByScope(
          documentScan.documents,
          selectedScopes,
        );
        const kindUsageCounts = countKindUsage(
          configuration.kinds,
          selectedDocuments,
        );
        const tagUsageCounts = countTagUsage(
          configuration.tags,
          selectedDocuments,
        );
        const usedOnly = selectedScopes.size > 0;

        let output = "";
        for (const shownCategory of categories) {
          if (shownCategory === "scopes") {
            output += renderDeclaredValues(
              "Scopes",
              configuration.scopes,
              documentScan.scopeUsageCounts,
              false,
            );
          } else if (shownCategory === "kinds") {
            output += renderDeclaredValues(
              "Kinds",
              configuration.kinds,
              kindUsageCounts,
              usedOnly,
            );
          } else {
            output += renderDeclaredValues(
              "Tags",
              configuration.tags,
              tagUsageCounts,
              usedOnly,
            );
          }
        }
        process.stdout.write(output);
      },
    );
}

function selectDocumentsByScope(
  documents: WaymarkDocument[],
  selectedScopes: Set<string>,
): WaymarkDocument[] {
  if (selectedScopes.size === 0) return documents;
  return documents.filter((document) =>
    document.scopes.some((scope) => selectedScopes.has(scope)),
  );
}

function countKindUsage(
  declarations: Map<string, ConfigurationDeclaration>,
  documents: WaymarkDocument[],
): Map<string, number> {
  const counts = createUsageCounts(declarations);
  for (const document of documents) incrementUsageCount(counts, document.kind);
  return counts;
}

function countTagUsage(
  declarations: Map<string, ConfigurationDeclaration>,
  documents: WaymarkDocument[],
): Map<string, number> {
  const counts = createUsageCounts(declarations);
  for (const document of documents) {
    for (const tag of document.tags) incrementUsageCount(counts, tag);
  }
  return counts;
}

function renderDeclaredValues(
  heading: string,
  values: Map<string, ConfigurationDeclaration>,
  usageCounts: Map<string, number>,
  usedOnly: boolean,
): string {
  let output = `${heading}:\n`;
  const sortedValues = [...values.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  for (const [identifier, value] of sortedValues) {
    const documentCount = usageCounts.get(identifier) ?? 0;
    if (usedOnly && documentCount === 0) continue;
    const noun = documentCount === 1 ? "document" : "documents";
    const description = value.description.replaceAll(/\s+/g, " ").trim();
    output +=
      `  ${identifier} — ${description} ` + `(${documentCount} ${noun})\n`;
  }
  return output;
}
