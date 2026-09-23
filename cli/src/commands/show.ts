import { Argument, Command } from "commander";

import {
  loadConfiguration,
  type ConfigurationDeclaration,
} from "../configuration/index.js";
import { throwDiagnostics } from "../diagnostics.js";
import {
  countDocumentMetadataUsage,
  scanDocuments,
} from "../documents/index.js";

const showCategories = ["scopes", "kinds", "tags"] as const;

type ShowCategory = (typeof showCategories)[number];

type ShowOptions = {
  scopes?: string[];
};

export function createShowCommand(): Command {
  return new Command("show")
    .description("List declared scopes, kinds, and tags")
    .addArgument(
      new Argument("[category]", "list only scopes, kinds, or tags").choices(
        showCategories,
      ),
    )
    .option(
      "--scopes <identifiers>",
      "select documents matching any scope (comma-separated, repeatable)",
      collectScopeOptionValue,
    )
    .action(
      async (category: ShowCategory | undefined, options: ShowOptions) => {
        const loadedConfiguration = await loadConfiguration(process.cwd());
        if (loadedConfiguration.kind === "invalid") {
          throwDiagnostics(loadedConfiguration.diagnostics);
        }

        const { configuration, rootPath } = loadedConfiguration;
        const selectedScopes = parseScopeOptions({
          values: options.scopes ?? [],
          declarations: configuration.scopes,
        });
        const documentScan = await scanDocuments({ rootPath, configuration });
        if (documentScan.kind === "invalid") {
          throwDiagnostics(documentScan.diagnostics);
        }

        const categories = category ? [category] : showCategories;
        const { kindUsageCounts, tagUsageCounts } = countDocumentMetadataUsage({
          documents: documentScan.documents,
          selectedScopes,
          declaredKinds: configuration.kinds,
          declaredTags: configuration.tags,
        });
        const usedOnly = selectedScopes.size > 0;

        let output = "";
        for (const shownCategory of categories) {
          if (shownCategory === "scopes") {
            output += renderDeclaredValues({
              heading: "Scopes",
              values: configuration.scopes,
              usageCounts: documentScan.scopeUsageCounts,
              usedOnly: false,
            });
          } else if (shownCategory === "kinds") {
            output += renderDeclaredValues({
              heading: "Kinds",
              values: configuration.kinds,
              usageCounts: kindUsageCounts,
              usedOnly,
            });
          } else {
            output += renderDeclaredValues({
              heading: "Tags",
              values: configuration.tags,
              usageCounts: tagUsageCounts,
              usedOnly,
            });
          }
        }
        process.stdout.write(output);
      },
    );
}

function collectScopeOptionValue(
  value: string,
  previous: string[] | undefined,
): string[] {
  return [...(previous ?? []), value];
}

function parseScopeOptions({
  values,
  declarations,
}: {
  values: string[];
  declarations: Map<string, ConfigurationDeclaration>;
}): Set<string> {
  const scopes = new Set<string>();
  for (const value of values) {
    for (const scope of value.split(",")) {
      if (scope === "") {
        throw new Error("--scopes contains an empty identifier.");
      }
      if (scopes.has(scope)) {
        throw new Error(`--scopes contains duplicate identifier "${scope}".`);
      }
      if (!declarations.has(scope)) {
        throw new Error(`--scopes contains undeclared scope "${scope}".`);
      }
      scopes.add(scope);
    }
  }
  return scopes;
}

function renderDeclaredValues({
  heading,
  values,
  usageCounts,
  usedOnly,
}: {
  heading: string;
  values: Map<string, ConfigurationDeclaration>;
  usageCounts: Map<string, number>;
  usedOnly: boolean;
}): string {
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
