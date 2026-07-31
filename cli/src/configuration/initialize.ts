import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { isErrorWithCode } from "../filesystem.js";
import {
  defaultConfigFileName,
  findConfigurationPath,
  findConfigurationPathInDirectory,
} from "./load.js";

const starterConfiguration =
  "# When true, document metadata must be nested under a `waymark` frontmatter key.\n" +
  "require-namespace: false\n" +
  "kinds:\n" +
  "  example-kind: Explain when agents should read this kind of document\n" +
  "tags:\n" +
  "  example-tag: Explain the topic represented by this tag\n";

export async function initializeConfiguration(
  directoryPath: string,
): Promise<{ configurationPath: string }> {
  const configurationPath = join(directoryPath, defaultConfigFileName);

  const existingConfigurationPath =
    await findConfigurationPathInDirectory(directoryPath);
  if (existingConfigurationPath) {
    throw new Error(
      `A Waymark configuration already exists at ${existingConfigurationPath}.`,
    );
  }

  const ancestorConfigurationPath = await findConfigurationPath(
    dirname(directoryPath),
  );
  if (ancestorConfigurationPath) {
    throw new Error(
      "Cannot create a nested Waymark configuration because one already " +
        `exists at ${ancestorConfigurationPath}.`,
    );
  }

  try {
    await writeFile(configurationPath, starterConfiguration, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error: unknown) {
    if (isErrorWithCode(error, "EEXIST")) {
      throw new Error(
        `A Waymark configuration already exists at ${configurationPath}.`,
      );
    }

    throw error;
  }

  return { configurationPath };
}
