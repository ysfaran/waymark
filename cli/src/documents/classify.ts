import { parse } from "yaml";

import type { ConfigurationDeclaration } from "../configuration/index.js";

type ClassifiedDocument = {
  kind: string;
  description: string;
  tags: string[];
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

type ValidationContext = {
  path: string;
  declaredKinds: Map<string, ConfigurationDeclaration>;
  declaredTags: Map<string, ConfigurationDeclaration>;
  diagnostics: DocumentDiagnostic[];
};

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
  if (frontmatter.kind === "none" || !isRecord(frontmatter.value)) {
    return { kind: "unregistered" };
  }

  return validateRegistration({
    frontmatter: frontmatter.value,
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
  frontmatter: Record<string, unknown>;
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

  const diagnostics: DocumentDiagnostic[] = [];
  if (hasNamespace && hasRecognizedFlatMetadata) {
    diagnostics.push({
      path,
      field: "waymark",
      message: "Flat and namespaced metadata cannot both be declared.",
    });
    return { kind: "invalid", diagnostics };
  }

  const namespaced = hasNamespace;
  const value = namespaced ? frontmatter.waymark : frontmatter;
  const fieldPrefix = namespaced ? "waymark." : "";
  if (!isRecord(value)) {
    diagnostics.push({
      path,
      field: namespaced ? "waymark" : "frontmatter",
      message: "Expected a mapping.",
    });
    return { kind: "invalid", diagnostics };
  }

  if (namespaced) {
    const allowedFields = new Set(["kind", "description", "tags"]);
    for (const field of Object.keys(value)) {
      if (!allowedFields.has(field)) {
        diagnostics.push({
          path,
          field: `${fieldPrefix}${field}`,
          message: "Unknown field.",
        });
      }
    }
  }

  const context = { path, declaredKinds, declaredTags, diagnostics };
  const kind = validateDocumentKind({
    value: value.kind,
    field: `${fieldPrefix}kind`,
    context,
  });
  const description = validateDocumentDescription({
    value: value.description,
    field: `${fieldPrefix}description`,
    context,
  });
  const tags = validateDocumentTags({
    value: value.tags,
    field: `${fieldPrefix}tags`,
    context,
  });

  if (
    diagnostics.length > 0 ||
    kind === undefined ||
    description === undefined ||
    tags === undefined
  ) {
    return { kind: "invalid", diagnostics };
  }

  return {
    kind: "registered",
    document: { kind, description, tags, body },
  };
}

function validateDocumentKind({
  value,
  field,
  context,
}: {
  value: unknown;
  field: string;
  context: ValidationContext;
}): string | undefined {
  if (value === undefined) {
    context.diagnostics.push({
      path: context.path,
      field,
      message: "Document kind is required.",
    });
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    context.diagnostics.push({
      path: context.path,
      field,
      message: "Document kind must be a non-empty string.",
    });
    return undefined;
  }
  if (!context.declaredKinds.has(value)) {
    context.diagnostics.push({
      path: context.path,
      field,
      message: `Undeclared kind "${value}".`,
    });
  }
  return value;
}

function validateDocumentDescription({
  value,
  field,
  context,
}: {
  value: unknown;
  field: string;
  context: ValidationContext;
}): string | undefined {
  if (value === undefined) {
    context.diagnostics.push({
      path: context.path,
      field,
      message: "Document Description is required.",
    });
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    context.diagnostics.push({
      path: context.path,
      field,
      message: "Document Description must be a non-empty string.",
    });
    return undefined;
  }
  return value;
}

function validateDocumentTags({
  value,
  field,
  context,
}: {
  value: unknown;
  field: string;
  context: ValidationContext;
}): string[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    context.diagnostics.push({
      path: context.path,
      field,
      message: "Expected a YAML sequence of tags.",
    });
    return undefined;
  }

  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== "string" || tag.trim() === "") {
      context.diagnostics.push({
        path: context.path,
        field,
        message: "Every tag must be a non-empty string.",
      });
      continue;
    }
    if (seenTags.has(tag)) {
      context.diagnostics.push({
        path: context.path,
        field,
        message: `Duplicate tag "${tag}".`,
      });
      continue;
    }
    seenTags.add(tag);
    tags.push(tag);
    if (!context.declaredTags.has(tag)) {
      context.diagnostics.push({
        path: context.path,
        field,
        message: `Undeclared tag "${tag}".`,
      });
    }
  }
  return tags;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
