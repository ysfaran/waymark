type DocumentMetadata = {
  scopes: string[];
  kind: string;
  tags: string[];
};

type DocumentMetadataUsageCounts = {
  kindUsageCounts: Map<string, number>;
  tagUsageCounts: Map<string, number>;
};

export function countDocumentMetadataUsage({
  documents,
  selectedScopes,
  declaredKinds,
  declaredTags,
}: {
  documents: DocumentMetadata[];
  selectedScopes: Set<string>;
  declaredKinds: Map<string, unknown>;
  declaredTags: Map<string, unknown>;
}): DocumentMetadataUsageCounts {
  const kindUsageCounts = createUsageCounts(declaredKinds);
  const tagUsageCounts = createUsageCounts(declaredTags);

  for (const document of documents) {
    if (
      selectedScopes.size > 0 &&
      !document.scopes.some((scope) => selectedScopes.has(scope))
    ) {
      continue;
    }

    incrementUsageCount(kindUsageCounts, document.kind);
    for (const tag of document.tags) {
      incrementUsageCount(tagUsageCounts, tag);
    }
  }

  return { kindUsageCounts, tagUsageCounts };
}

export function createUsageCounts(
  declarations: Map<string, unknown>,
): Map<string, number> {
  return new Map([...declarations.keys()].map((identifier) => [identifier, 0]));
}

export function incrementUsageCount(
  usageCounts: Map<string, number>,
  identifier: string,
): void {
  const currentCount = usageCounts.get(identifier);
  if (currentCount !== undefined) {
    usageCounts.set(identifier, currentCount + 1);
  }
}
