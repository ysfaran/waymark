import { Command } from "commander";

import { loadConfiguration } from "../configuration/index.js";
import { compareDiagnostics, throwDiagnostics } from "../diagnostics.js";
import {
  filterDocuments,
  scanDocuments,
  type WaymarkDocument,
} from "../documents/index.js";

type FindOptions = {
  kinds: string[];
  tags: string[];
  requireTags: string[];
  filter?: string;
  query?: string;
  show?: string;
  json?: boolean;
  tree?: boolean;
};

type ShownField = "kind" | "tags" | "description";

type ProjectedDocument = {
  path: string;
  kind?: string;
  tags?: string[];
  description?: string;
};

export function createFindCommand(): Command {
  return new Command("find")
    .description("Discover Waymark Documents")
    .option(
      "-k, --kinds <identifiers>",
      "Match any Document Kind (comma-separated, repeatable)",
      collectOptionValue,
      [],
    )
    .option(
      "-t, --tags <identifiers>",
      "Match any Document Tag (comma-separated, repeatable)",
      collectOptionValue,
      [],
    )
    .option(
      "-r, --require-tags <identifiers>",
      "Require every Document Tag (comma-separated, repeatable)",
      collectOptionValue,
      [],
    )
    .option("-f, --filter <expression>", "Match a Boolean Metadata Filter")
    .option("-q, --query <text>", "Match a literal Content Query")
    .option(
      "-s, --show <fields>",
      "Show kind, tags, and description (comma-separated)",
    )
    .option("--json", "Return a flat JSON array")
    .option("--tree", "Return a directory-tree presentation")
    .action(async (options: FindOptions) => {
      if (
        options.filter !== undefined &&
        (options.kinds.length > 0 ||
          options.tags.length > 0 ||
          options.requireTags.length > 0)
      ) {
        throw new Error(
          "--filter cannot be combined with --kinds, --tags, or --require-tags.",
        );
      }
      if (options.json && options.tree) {
        throw new Error("--json cannot be combined with --tree.");
      }
      const shownFields = parseShownFields(options.show);

      const loadedConfiguration = await loadConfiguration(process.cwd());
      if (loadedConfiguration.kind === "malformed") {
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
        throwDiagnostics(diagnostics);
      }

      const matchingDocuments = filterDocuments({
        documents: documentScan.documents,
        configuration,
        criteria: {
          kinds: options.kinds,
          tags: options.tags,
          requiredTags: options.requireTags,
          filter: options.filter,
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
  if (shownFields.has("kind")) projection.kind = document.kind;
  if (shownFields.has("tags")) projection.tags = document.tags;
  if (shownFields.has("description")) {
    projection.description = document.description;
  }
  return projection;
}

function parseShownFields(value: string | undefined): Set<ShownField> {
  if (value === undefined) return new Set();

  const shownFields = new Set<ShownField>();
  for (const field of value.split(",")) {
    if (field !== "kind" && field !== "tags" && field !== "description") {
      throw new Error(
        `Unknown find field "${field}". Expected kind, tags, or description.`,
      );
    }
    if (shownFields.has(field)) {
      throw new Error(`Duplicate find field "${field}".`);
    }
    shownFields.add(field);
  }
  return shownFields;
}

function renderDocumentLine(
  document: WaymarkDocument,
  shownFields: Set<ShownField>,
  displayedPath = document.path,
): string {
  let line = displayedPath;
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

function collectOptionValue(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
