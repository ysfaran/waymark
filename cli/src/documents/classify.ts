import { parse } from "yaml";
import { z } from "zod";

import type { ConfigurationDeclaration } from "../configuration/index.js";

const rawFrontmatterSchema = z.record(z.string(), z.unknown());

type RawFrontmatter = z.infer<typeof rawFrontmatterSchema>;

type ClassifiedDocument = z.infer<ReturnType<typeof createDocumentSchema>> & {
  body: string;
};

type DocumentDiagnostic = {
  path: string;
  field: string;
  message: string;
};

type DocumentClassification =
  | { kind: "unregistered" }
  | { kind: "invalid"; diagnostics: DocumentDiagnostic[] }
  | { kind: "registered"; document: ClassifiedDocument };

export function classifyDocument({
  source,
  requireNamespace,
  declaredKinds,
  declaredTags,
  path,
}: {
  source: string;
  requireNamespace: boolean;
  declaredKinds: Map<string, ConfigurationDeclaration>;
  declaredTags: Map<string, ConfigurationDeclaration>;
  path: string;
}): DocumentClassification {
  const frontmatter = readFrontmatter(source);
  if (frontmatter.kind === "malformed") {
    return {
      kind: "invalid",
      diagnostics: [
        {
          path,
          field: "frontmatter",
          message: "Malformed YAML frontmatter.",
        },
      ],
    };
  }
  if (frontmatter.kind === "none") {
    return { kind: "unregistered" };
  }

  const frontmatterResult = rawFrontmatterSchema.safeParse(frontmatter.value);
  if (!frontmatterResult.success) return { kind: "unregistered" };

  return validateRegistration({
    frontmatter: frontmatterResult.data,
    body: frontmatter.body,
    requireNamespace,
    declaredKinds,
    declaredTags,
    path,
  });
}

function readFrontmatter(
  source: string,
):
  | { kind: "none" }
  | { kind: "malformed" }
  | { kind: "parsed"; value: unknown; body: string } {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return { kind: "none" };
  }

  const match = /^---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(source);
  if (!match) return { kind: "malformed" };

  try {
    return {
      kind: "parsed",
      value: parse(match[1]) as unknown,
      body: source.slice(match[0].length),
    };
  } catch {
    return { kind: "malformed" };
  }
}

function validateRegistration({
  frontmatter,
  body,
  requireNamespace,
  declaredKinds,
  declaredTags,
  path,
}: {
  frontmatter: RawFrontmatter;
  body: string;
  requireNamespace: boolean;
  declaredKinds: Map<string, ConfigurationDeclaration>;
  declaredTags: Map<string, ConfigurationDeclaration>;
  path: string;
}): DocumentClassification {
  const hasNamespace = Object.hasOwn(frontmatter, "waymark");
  const hasRecognizedFlatMetadata =
    Object.hasOwn(frontmatter, "kind") &&
    Object.hasOwn(frontmatter, "description");

  if (requireNamespace && !hasNamespace) return { kind: "unregistered" };
  if (!requireNamespace && !hasNamespace && !hasRecognizedFlatMetadata) {
    return { kind: "unregistered" };
  }

  if (hasNamespace && hasRecognizedFlatMetadata) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          path,
          field: "waymark",
          message: "Flat and namespaced metadata cannot both be declared.",
        },
      ],
    };
  }

  const namespaced = hasNamespace;
  const value = namespaced
    ? frontmatter.waymark
    : {
        kind: frontmatter.kind,
        description: frontmatter.description,
        tags: frontmatter.tags,
      };
  const fieldPrefix = namespaced ? "waymark." : "";
  const metadataResult = createDocumentSchema({
    declaredKinds,
    declaredTags,
  }).safeParse(value);
  if (!metadataResult.success) {
    return {
      kind: "invalid",
      diagnostics: createDocumentDiagnostics({
        error: metadataResult.error,
        path,
        fieldPrefix,
        rootField: namespaced ? "waymark" : "frontmatter",
      }),
    };
  }

  return {
    kind: "registered",
    document: { ...metadataResult.data, body },
  };
}

function createDocumentSchema({
  declaredKinds,
  declaredTags,
}: {
  declaredKinds: Map<string, ConfigurationDeclaration>;
  declaredTags: Map<string, ConfigurationDeclaration>;
}) {
  return z.strictObject(
    {
      kind: z
        .string({
          error: (issue) =>
            issue.input === undefined
              ? "Document kind is required."
              : "Document kind must be a non-empty string.",
        })
        .refine((kind) => kind.trim() !== "", {
          error: "Document kind must be a non-empty string.",
        })
        .superRefine((kind, context) => {
          if (kind.trim() !== "" && !declaredKinds.has(kind)) {
            context.addIssue({
              code: "custom",
              message: `Undeclared kind "${kind}".`,
            });
          }
        }),
      description: z
        .string({
          error: (issue) =>
            issue.input === undefined
              ? "Document Description is required."
              : "Document Description must be a non-empty string.",
        })
        .refine((description) => description.trim() !== "", {
          error: "Document Description must be a non-empty string.",
        }),
      tags: z
        .array(z.unknown(), { error: "Expected a YAML sequence of tags." })
        .default([])
        .superRefine((tags, context) => {
          const seenTags = new Set<string>();
          for (const tag of tags) {
            if (typeof tag !== "string" || tag.trim() === "") {
              context.addIssue({
                code: "custom",
                message: "Every tag must be a non-empty string.",
              });
              continue;
            }
            if (seenTags.has(tag)) {
              context.addIssue({
                code: "custom",
                message: `Duplicate tag "${tag}".`,
              });
              continue;
            }
            seenTags.add(tag);
            if (!declaredTags.has(tag)) {
              context.addIssue({
                code: "custom",
                message: `Undeclared tag "${tag}".`,
              });
            }
          }
        })
        .transform((tags): string[] =>
          tags.filter((tag): tag is string => typeof tag === "string"),
        ),
    },
    { error: "Expected a mapping." },
  );
}

function createDocumentDiagnostics({
  error,
  path,
  fieldPrefix,
  rootField,
}: {
  error: z.ZodError;
  path: string;
  fieldPrefix: string;
  rootField: string;
}): DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = [];
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        diagnostics.push({
          path,
          field: `${fieldPrefix}${key}`,
          message: "Unknown field.",
        });
      }
      continue;
    }
    const field = issue.path.find(
      (segment): segment is string => typeof segment === "string",
    );
    diagnostics.push({
      path,
      field: field === undefined ? rootField : `${fieldPrefix}${field}`,
      message: issue.message,
    });
  }
  return diagnostics;
}
