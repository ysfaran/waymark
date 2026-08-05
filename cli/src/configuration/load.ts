import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { compareDiagnostics } from "../diagnostics.js";
import { pathExists } from "../filesystem.js";

export const defaultConfigFileName = "waymark.yml";
export const allowedConfigFileNames = [
  defaultConfigFileName,
  "waymark.yaml",
] as const;

const ignorePatternSchema = z
  .string({ error: "Ignore glob must be a non-empty string." })
  .superRefine((pattern, context) => {
    if (pattern.trim() === "") {
      context.addIssue({
        code: "custom",
        message: "Ignore glob must be a non-empty string.",
      });
      return;
    }
    if (pattern.startsWith("!")) {
      context.addIssue({
        code: "custom",
        message: "Negation is not supported in ignore globs.",
      });
      return;
    }
    if (/[![\]{}()]/.test(pattern)) {
      context.addIssue({
        code: "custom",
        message: "Only *, ?, and ** wildcard syntax is supported.",
      });
    }
  });

export type ConfigurationDeclaration = {
  description: string;
};

export type ConfigurationDiagnostic = {
  path: string;
  field: string;
  message: string;
};

const configurationDeclarationsSchema = z
  .record(z.string(), z.unknown(), { error: "Expected a mapping." })
  .superRefine((declarations, context) => {
    for (const [identifier, description] of Object.entries(declarations)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier)) {
        context.addIssue({
          code: "custom",
          path: [identifier],
          message: "Identifier must use lowercase kebab-case.",
        });
      }
      if (typeof description !== "string" || description.trim() === "") {
        context.addIssue({
          code: "custom",
          path: [identifier],
          message: "Description must be a non-empty string.",
        });
      }
    }
  })
  .transform(
    (declarations): Map<string, ConfigurationDeclaration> =>
      new Map(
        Object.entries(declarations)
          .filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          )
          .map(([identifier, description]) => [identifier, { description }]),
      ),
  );

const configurationSchema = z
  .strictObject(
    {
      "require-namespace": z
        .boolean({ error: "Expected a boolean." })
        .default(false),
      kinds: configurationDeclarationsSchema,
      tags: configurationDeclarationsSchema,
      ignore: z
        .array(ignorePatternSchema, {
          error: "Expected a sequence of ignore globs.",
        })
        .default([]),
    },
    { error: "Expected a mapping." },
  )
  .transform((configuration) => ({
    requireNamespace: configuration["require-namespace"],
    kinds: configuration.kinds,
    tags: configuration.tags,
    ignorePatterns: configuration.ignore,
  }));

export type Configuration = z.infer<typeof configurationSchema>;

export type ConfigurationLoadResult =
  | {
      kind: "loaded";
      rootPath: string;
      configuration: Configuration;
    }
  | {
      kind: "invalid";
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
      kind: "invalid",
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

  const configurationResult =
    configurationSchema.safeParse(parsedConfiguration);
  if (!configurationResult.success) {
    return {
      kind: "invalid",
      rootPath,
      diagnostics: createConfigurationDiagnostics({
        error: configurationResult.error,
        configurationFileName: loadedConfigurationFileName,
      }),
    };
  }

  return {
    kind: "loaded",
    rootPath,
    configuration: configurationResult.data,
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

function createConfigurationDiagnostics({
  error,
  configurationFileName,
}: {
  error: z.ZodError;
  configurationFileName: string;
}): ConfigurationDiagnostic[] {
  const diagnostics: ConfigurationDiagnostic[] = [];
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "configuration";
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        diagnostics.push({
          path: configurationFileName,
          field: [...issue.path, key].join("."),
          message: "Unknown field.",
        });
      }
      continue;
    }
    diagnostics.push({
      path: configurationFileName,
      field,
      message: issue.message,
    });
  }
  return diagnostics.sort(compareDiagnostics);
}
