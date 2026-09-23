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
