import { Command } from "commander";

import { loadConfiguration } from "../configuration/index.js";
import { compareDiagnostics, throwDiagnostics } from "../diagnostics.js";
import {
  filterDocuments,
  scanDocuments,
  type WaymarkDocument,
} from "../documents/index.js";

type FindOptions = {
  scopes?: string[];
  kinds?: string[];
  tags?: string[];
  requireTags?: string[];
  filter?: string;
  query?: string;
  show?: string;
  json?: boolean;
  tree?: boolean;
};

const SHOWN_FIELDS = ["scopes", "kind", "tags", "description"] as const;

type ShownField = (typeof SHOWN_FIELDS)[number];

type ProjectedDocument = {
  path: string;
  scopes?: string[];
  kind?: string;
  tags?: string[];
  description?: string;
};

export function createFindCommand(): Command {
  return new Command("find")
    .description("Discover Waymark Documents")
    .option(
      "--scopes <identifiers>",
      "match any scope (comma-separated, repeatable)",
      collectOptionValue,
    )
    .option(
      "-k, --kinds <identifiers>",
      "match any kind (comma-separated, repeatable)",
      collectOptionValue,
    )
    .option(
      "-t, --tags <identifiers>",
      "match any tag (comma-separated, repeatable)",
      collectOptionValue,
    )
    .option(
      "-T, --require-tags <identifiers>",
      "require every tag (comma-separated, repeatable)",
      collectOptionValue,
    )
    .option("-f, --filter <expression>", "match a boolean filter expression")
    .option(
      "-q, --query <text>",
      "match literal text content (case-insensitive)",
    )
    .option(
      "-s, --show <fields>",
      "show only selected metadata fields (comma-separated; defaults to all)",
    )
    .option("--json", "return a flat JSON array")
    .option("--tree", "output documents as directory tree")
    .action(async (options: FindOptions) => {
      const scopes = options.scopes ?? [];
      const kinds = options.kinds ?? [];
      const tags = options.tags ?? [];
      const requiredTags = options.requireTags ?? [];
      if (
        options.filter !== undefined &&
        (scopes.length > 0 ||
          kinds.length > 0 ||
          tags.length > 0 ||
          requiredTags.length > 0)
      ) {
        throw new Error(
          "--filter cannot be combined with --scopes, --kinds, --tags, or --require-tags.",
        );
      }
      if (options.json && options.tree) {
        throw new Error("--json cannot be combined with --tree.");
      }
      const shownFields = parseShownFields(options.show);

      const loadedConfiguration = await loadConfiguration(process.cwd());
      if (loadedConfiguration.kind === "invalid") {
        throwDiagnostics(loadedConfiguration.diagnostics);
      }

      const { configuration, rootPath } = loadedConfiguration;
      const metadataCriteria =
        options.filter === undefined
          ? {
              method: "filter-groups" as const,
              scopes: parseIdentifierOptions({
                optionName: "--scopes",
                values: scopes,
                declarations: configuration.scopes,
                declarationName: "scope",
              }),
              kinds: parseIdentifierOptions({
                optionName: "--kinds",
                values: kinds,
                declarations: configuration.kinds,
                declarationName: "kind",
              }),
              tags: parseIdentifierOptions({
                optionName: "--tags",
                values: tags,
                declarations: configuration.tags,
                declarationName: "tag",
              }),
              requiredTags: parseIdentifierOptions({
                optionName: "--require-tags",
                values: requiredTags,
                declarations: configuration.tags,
                declarationName: "tag",
              }),
            }
          : {
              method: "filter-expression" as const,
              expression: options.filter,
            };
      const documentScan = await scanDocuments({ rootPath, configuration });
      if (documentScan.kind === "invalid") {
        throwDiagnostics(documentScan.diagnostics.sort(compareDiagnostics));
      }

      const matchingDocuments = filterDocuments({
        documents: documentScan.documents,
        configuration,
        criteria: {
          metadata: metadataCriteria,
          query: options.query,
        },
      });

      if (options.json) {
        process.stdout.write(
          `${JSON.stringify(
            matchingDocuments.map((document) =>
              projectDocument(document, shownFields),
            ),
            undefined,
            2,
          )}\n`,
        );
      } else if (options.tree) {
        process.stdout.write(
          renderDocumentTree(matchingDocuments, shownFields),
        );
      } else {
        process.stdout.write(
          matchingDocuments
            .map((document) => renderDocumentLine(document, shownFields))
            .join("\n") + (matchingDocuments.length > 0 ? "\n" : ""),
        );
      }
    });
}

function projectDocument(
  document: WaymarkDocument,
  shownFields: Set<ShownField>,
): ProjectedDocument {
  const projection: ProjectedDocument = { path: document.path };
  if (shownFields.has("scopes")) projection.scopes = document.scopes;
  if (shownFields.has("kind")) projection.kind = document.kind;
  if (shownFields.has("tags")) projection.tags = document.tags;
  if (shownFields.has("description")) {
    projection.description = document.description;
  }
  return projection;
}

function parseShownFields(value: string | undefined): Set<ShownField> {
  if (value === undefined) return new Set(SHOWN_FIELDS);

  const shownFields = new Set<ShownField>();
  for (const field of value.split(",")) {
    if (!isShownField(field)) {
      throw new Error(
        `Unknown find field "${field}". Expected scopes, kind, tags, or description.`,
      );
    }
    if (shownFields.has(field)) {
      throw new Error(`Duplicate find field "${field}".`);
    }
    shownFields.add(field);
  }
  return shownFields;
}

function isShownField(field: string): field is ShownField {
  return SHOWN_FIELDS.some((shownField) => shownField === field);
}

function renderDocumentLine(
  document: WaymarkDocument,
  shownFields: Set<ShownField>,
  displayedPath = document.path,
): string {
  let line = displayedPath;
  if (shownFields.has("scopes")) line += ` [${document.scopes.join(",")}]`;
  if (shownFields.has("kind")) line += ` [${document.kind}]`;
  if (shownFields.has("tags")) line += ` [${document.tags.join(",")}]`;
  if (shownFields.has("description")) {
    const description = document.description.replaceAll(/\s+/g, " ").trim();
    line += ` — ${description}`;
  }
  return line;
}

type TreeDirectory = {
  directories: Map<string, TreeDirectory>;
  documents: Map<string, WaymarkDocument>;
};

function renderDocumentTree(
  documents: WaymarkDocument[],
  shownFields: Set<ShownField>,
): string {
  const root = createTreeDirectory();
  for (const document of documents) {
    const pathParts = document.path.split("/");
    const fileName = pathParts.pop();
    if (!fileName) continue;

    let directory = root;
    for (const pathPart of pathParts) {
      let childDirectory = directory.directories.get(pathPart);
      if (!childDirectory) {
        childDirectory = createTreeDirectory();
        directory.directories.set(pathPart, childDirectory);
      }
      directory = childDirectory;
    }
    directory.documents.set(fileName, document);
  }

  let output = "";
  for (const entry of sortedTreeEntries(root)) {
    if (entry.kind === "document") {
      output += `${renderDocumentLine(entry.document, shownFields, entry.name)}\n`;
    } else {
      output += `${entry.name}/\n`;
      output += renderTreeDirectory(entry.directory, shownFields, "");
    }
  }
  return output;
}

function renderTreeDirectory(
  directory: TreeDirectory,
  shownFields: Set<ShownField>,
  prefix: string,
): string {
  const entries = sortedTreeEntries(directory);
  let output = "";
  for (const [index, entry] of entries.entries()) {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    if (entry.kind === "document") {
      output +=
        `${prefix}${connector}` +
        `${renderDocumentLine(entry.document, shownFields, entry.name)}\n`;
    } else {
      output += `${prefix}${connector}${entry.name}/\n`;
      output += renderTreeDirectory(
        entry.directory,
        shownFields,
        `${prefix}${isLast ? "    " : "│   "}`,
      );
    }
  }
  return output;
}

function sortedTreeEntries(
  directory: TreeDirectory,
): (
  | { kind: "directory"; name: string; directory: TreeDirectory }
  | { kind: "document"; name: string; document: WaymarkDocument }
)[] {
  return [
    ...[...directory.directories].map(([name, childDirectory]) => ({
      kind: "directory" as const,
      name,
      directory: childDirectory,
    })),
    ...[...directory.documents].map(([name, document]) => ({
      kind: "document" as const,
      name,
      document,
    })),
  ].sort((left, right) =>
    compareText(
      left.kind === "directory" ? `${left.name}/` : left.name,
      right.kind === "directory" ? `${right.name}/` : right.name,
    ),
  );
}

function createTreeDirectory(): TreeDirectory {
  return {
    directories: new Map(),
    documents: new Map(),
  };
}

function collectOptionValue(
  value: string,
  previous: string[] | undefined,
): string[] {
  return [...(previous ?? []), value];
}

function parseIdentifierOptions({
  optionName,
  values,
  declarations,
  declarationName,
}: {
  optionName: string;
  values: string[];
  declarations: Map<string, unknown>;
  declarationName: "scope" | "kind" | "tag";
}): Set<string> {
  const identifiers = new Set<string>();
  for (const value of values) {
    for (const identifier of value.split(",")) {
      if (identifier === "") {
        throw new Error(`${optionName} contains an empty identifier.`);
      }
      if (identifiers.has(identifier)) {
        throw new Error(
          `${optionName} contains duplicate identifier "${identifier}".`,
        );
      }
      if (!declarations.has(identifier)) {
        throw new Error(
          `${optionName} contains undeclared ${declarationName} "${identifier}".`,
        );
      }
      identifiers.add(identifier);
    }
  }
  return identifiers;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
