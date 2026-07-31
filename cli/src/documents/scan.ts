import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

import { convertPathToPattern, globby } from "globby";

import {
  allowedConfigFileNames,
  type Configuration,
} from "../configuration/index.js";
import { isErrorWithCode } from "../filesystem.js";
import { classifyDocument } from "./classify.js";

export type WaymarkDocument = {
  path: string;
  kind: string;
  description: string;
  tags: string[];
  body: string;
};

export type DocumentScanDiagnostic = {
  path: string;
  field: string;
  message: string;
};

type DocumentScanScope = {
  directoryPath: string;
  recursive: boolean;
};

export type DocumentScanResult =
  | {
      kind: "valid";
      documents: WaymarkDocument[];
      unregisteredDocuments: string[];
      kindUsageCounts: Map<string, number>;
      tagUsageCounts: Map<string, number>;
    }
  | {
      kind: "invalid";
      diagnostics: DocumentScanDiagnostic[];
    };

export async function scanDocuments({
  rootPath,
  configuration,
  scope,
}: {
  rootPath: string;
  configuration: Configuration;
  scope?: DocumentScanScope;
}): Promise<DocumentScanResult> {
  const { rootPath: scanRootPath, scope: resolvedScope } =
    await resolveDocumentScanScope({ rootPath, scope });
  const discoveredPaths = await globby(createCandidatePatterns(resolvedScope), {
    cwd: scanRootPath,
    gitignore: true,
    ignore: ["**/.git", "**/.git/**", ...configuration.ignorePatterns],
    dot: true,
    followSymbolicLinks: false,
    braceExpansion: false,
    extglob: false,
  });
  const documents: WaymarkDocument[] = [];
  const kindUsageCounts = createUsageCounts(configuration.kinds);
  const tagUsageCounts = createUsageCounts(configuration.tags);
  const diagnostics: DocumentScanDiagnostic[] = [];
  const unregisteredDocuments: string[] = [];

  for (const path of discoveredPaths.sort(compareText)) {
    if (allowedConfigFileNames.some((fileName) => fileName === path)) continue;
    if (
      allowedConfigFileNames.some((fileName) => path.endsWith(`/${fileName}`))
    ) {
      diagnostics.push({
        path,
        field: "configuration",
        message: "Nested Waymark configurations are not allowed.",
      });
      continue;
    }

    const source = await readFile(join(scanRootPath, path), "utf8");
    const classification = classifyDocument({
      source,
      requireNamespace: configuration.requireNamespace,
      declaredKinds: configuration.kinds,
      declaredTags: configuration.tags,
      path,
    });
    if (classification.kind === "unregistered") {
      unregisteredDocuments.push(path);
      continue;
    }
    if (classification.kind === "invalid") {
      diagnostics.push(...classification.diagnostics);
      continue;
    }

    const document = { path, ...classification.document };
    documents.push(document);
    incrementUsageCount(kindUsageCounts, document.kind);
    for (const tag of document.tags) incrementUsageCount(tagUsageCounts, tag);
  }

  if (diagnostics.length > 0) {
    return {
      kind: "invalid",
      diagnostics: diagnostics.sort(compareDiagnostics),
    };
  }

  return {
    kind: "valid",
    documents,
    unregisteredDocuments,
    kindUsageCounts,
    tagUsageCounts,
  };
}

async function resolveDocumentScanScope({
  rootPath,
  scope,
}: {
  rootPath: string;
  scope: DocumentScanScope | undefined;
}): Promise<{
  rootPath: string;
  scope: { relativeDirectoryPath: string; recursive: boolean } | undefined;
}> {
  if (!scope) return { rootPath, scope };

  let directoryStats;
  try {
    directoryStats = await lstat(scope.directoryPath);
  } catch (error: unknown) {
    if (isErrorWithCode(error, "ENOENT")) {
      throw new Error(`Directory does not exist: ${scope.directoryPath}`);
    }
    throw error;
  }
  if (!directoryStats.isDirectory()) {
    throw new Error(`Not a directory: ${scope.directoryPath}`);
  }

  const canonicalRootPath = await realpath(rootPath);
  const canonicalDirectoryPath = await realpath(scope.directoryPath);
  const relativeDirectoryPath = relative(
    canonicalRootPath,
    canonicalDirectoryPath,
  );
  if (
    relativeDirectoryPath !== "" &&
    (relativeDirectoryPath === ".." ||
      relativeDirectoryPath.startsWith(`..${sep}`) ||
      isAbsolute(relativeDirectoryPath))
  ) {
    throw new Error(
      `Directory is outside the configuration root: ${scope.directoryPath}`,
    );
  }

  return {
    rootPath: canonicalRootPath,
    scope: {
      relativeDirectoryPath,
      recursive: scope.recursive,
    },
  };
}

function createCandidatePatterns(
  scope:
    | {
        relativeDirectoryPath: string;
        recursive: boolean;
      }
    | undefined,
): string[] {
  if (!scope) {
    return [
      "**/*.md",
      "**/*.mdx",
      ...allowedConfigFileNames.map((fileName) => `**/${fileName}`),
    ];
  }

  const directoryPattern = convertPathToPattern(scope.relativeDirectoryPath);
  const directoryPrefix = directoryPattern === "" ? "" : `${directoryPattern}/`;
  const candidatePrefix = scope.recursive
    ? `${directoryPrefix}**/`
    : directoryPrefix;
  return [
    `${candidatePrefix}*.md`,
    `${candidatePrefix}*.mdx`,
    ...allowedConfigFileNames.map(
      (fileName) => `${candidatePrefix}${fileName}`,
    ),
  ];
}

function createUsageCounts(
  declarations: Map<string, unknown>,
): Map<string, number> {
  return new Map([...declarations.keys()].map((identifier) => [identifier, 0]));
}

function incrementUsageCount(
  usageCounts: Map<string, number>,
  identifier: string,
): void {
  const currentCount = usageCounts.get(identifier);
  if (currentCount !== undefined) {
    usageCounts.set(identifier, currentCount + 1);
  }
}

function compareDiagnostics(
  left: DocumentScanDiagnostic,
  right: DocumentScanDiagnostic,
): number {
  return (
    compareText(left.path, right.path) ||
    compareText(left.field, right.field) ||
    compareText(left.message, right.message)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
