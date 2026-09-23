export function collectOptionValue(
  value: string,
  previous: string[] | undefined,
): string[] {
  return [...(previous ?? []), value];
}

export function parseIdentifierOptions({
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
