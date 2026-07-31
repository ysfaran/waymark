import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { parse } from "yaml";

import { pathExists } from "../filesystem.js";

export const defaultConfigFileName = "waymark.yml";
export const allowedConfigFileNames = [
  defaultConfigFileName,
  "waymark.yaml",
] as const;

export type ConfigurationDeclaration = {
  description: string;
};

export type ConfigurationDiagnostic = {
  path: string;
  field: string;
  message: string;
};

export type Configuration = {
  requireNamespace: boolean;
  kinds: Map<string, ConfigurationDeclaration>;
  tags: Map<string, ConfigurationDeclaration>;
  ignorePatterns: string[];
};

export type ConfigurationLoadResult =
  | {
      kind: "loaded";
      rootPath: string;
      configuration: Configuration;
      diagnostics: ConfigurationDiagnostic[];
    }
  | {
      kind: "malformed";
      rootPath: string;
      diagnostics: ConfigurationDiagnostic[];
    };

export async function loadConfiguration(
  startingDirectoryPath: string,
): Promise<ConfigurationLoadResult> {
  const configurationPath = await findConfigurationPath(startingDirectoryPath);
  if (!configurationPath) {
    throw new Error(
      `Could not find ${allowedConfigFileNames.join(" or ")} from ${resolve(startingDirectoryPath)}.`,
    );
  }

  const rootPath = dirname(configurationPath);
  const loadedConfigurationFileName = basename(configurationPath);
  let parsedConfiguration: unknown;
  try {
    parsedConfiguration = parse(
      await readFile(configurationPath, "utf8"),
    ) as unknown;
  } catch {
    return {
      kind: "malformed",
      rootPath,
      diagnostics: [
        {
          path: loadedConfigurationFileName,
          field: "configuration",
          message: "Malformed YAML configuration.",
        },
      ],
    };
  }

  const diagnostics: ConfigurationDiagnostic[] = [];
  return {
    kind: "loaded",
    rootPath,
    configuration: validateConfiguration({
      value: parsedConfiguration,
      configurationFileName: loadedConfigurationFileName,
      diagnostics,
    }),
    diagnostics,
  };
}

export async function findConfigurationPath(
  startingDirectoryPath: string,
): Promise<string | undefined> {
  let directoryPath = resolve(startingDirectoryPath);
  let foundConfigurationPath: string | undefined;

  while (true) {
    const configurationPath =
      await findConfigurationPathInDirectory(directoryPath);
    if (configurationPath) foundConfigurationPath = configurationPath;

    const parentPath = dirname(directoryPath);
    if (parentPath === directoryPath) return foundConfigurationPath;
    directoryPath = parentPath;
  }
}

export async function findConfigurationPathInDirectory(
  directoryPath: string,
): Promise<string | undefined> {
  const configurationPaths: string[] = [];
  for (const fileName of allowedConfigFileNames) {
    const configurationPath = join(directoryPath, fileName);
    if (await pathExists(configurationPath)) {
      configurationPaths.push(configurationPath);
    }
  }

  if (configurationPaths.length > 1) {
    throw new Error(
      `Multiple Waymark configurations exist in ${resolve(directoryPath)}: ` +
        `${allowedConfigFileNames.join(", ")}.`,
    );
  }

  return configurationPaths[0];
}

function validateConfiguration({
  value,
  configurationFileName,
  diagnostics,
}: {
  value: unknown;
  configurationFileName: string;
  diagnostics: ConfigurationDiagnostic[];
}): Configuration {
  if (!isRecord(value)) {
    diagnostics.push({
      path: configurationFileName,
      field: "configuration",
      message: "Expected a mapping.",
    });
  }
  const configuration = isRecord(value) ? value : {};
  const allowedFields = new Set([
    "require-namespace",
    "kinds",
    "tags",
    "ignore",
  ]);
  for (const field of Object.keys(configuration)) {
    if (!allowedFields.has(field)) {
      diagnostics.push({
        path: configurationFileName,
        field,
        message: "Unknown field.",
      });
    }
  }

  if (
    configuration["require-namespace"] !== undefined &&
    typeof configuration["require-namespace"] !== "boolean"
  ) {
    diagnostics.push({
      path: configurationFileName,
      field: "require-namespace",
      message: "Expected a boolean.",
    });
  }

  return {
    requireNamespace: configuration["require-namespace"] === true,
    kinds: validateDeclarations({
      value: configuration.kinds,
      field: "kinds",
      configurationFileName,
      diagnostics,
    }),
    tags: validateDeclarations({
      value: configuration.tags,
      field: "tags",
      configurationFileName,
      diagnostics,
    }),
    ignorePatterns: validateIgnorePatterns({
      value: configuration.ignore,
      configurationFileName,
      diagnostics,
    }),
  };
}

function validateDeclarations({
  value,
  field,
  configurationFileName,
  diagnostics,
}: {
  value: unknown;
  field: "kinds" | "tags";
  configurationFileName: string;
  diagnostics: ConfigurationDiagnostic[];
}): Map<string, ConfigurationDeclaration> {
  if (!isRecord(value)) {
    diagnostics.push({
      path: configurationFileName,
      field,
      message: "Expected a mapping.",
    });
    return new Map();
  }

  const declarations = new Map<string, ConfigurationDeclaration>();
  for (const [identifier, description] of Object.entries(value)) {
    const diagnosticField = `${field}.${identifier}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier)) {
      diagnostics.push({
        path: configurationFileName,
        field: diagnosticField,
        message: "Identifier must use lowercase kebab-case.",
      });
    }
    if (typeof description !== "string" || description.trim() === "") {
      diagnostics.push({
        path: configurationFileName,
        field: diagnosticField,
        message: "Description must be a non-empty string.",
      });
    }

    declarations.set(identifier, {
      description: typeof description === "string" ? description : "",
    });
  }
  return declarations;
}

function validateIgnorePatterns({
  value,
  configurationFileName,
  diagnostics,
}: {
  value: unknown;
  configurationFileName: string;
  diagnostics: ConfigurationDiagnostic[];
}): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    diagnostics.push({
      path: configurationFileName,
      field: "ignore",
      message: "Expected a sequence of ignore globs.",
    });
    return [];
  }

  const ignorePatterns: string[] = [];
  for (const [index, pattern] of value.entries()) {
    const field = `ignore.${index}`;
    if (typeof pattern !== "string" || pattern.trim() === "") {
      diagnostics.push({
        path: configurationFileName,
        field,
        message: "Ignore glob must be a non-empty string.",
      });
      continue;
    }
    if (pattern.startsWith("!")) {
      diagnostics.push({
        path: configurationFileName,
        field,
        message: "Negation is not supported in ignore globs.",
      });
      continue;
    }
    if (/[![\]{}()]/.test(pattern)) {
      diagnostics.push({
        path: configurationFileName,
        field,
        message: "Only *, ?, and ** wildcard syntax is supported.",
      });
      continue;
    }
    ignorePatterns.push(pattern);
  }
  return ignorePatterns;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
