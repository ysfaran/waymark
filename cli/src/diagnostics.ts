export type Diagnostic = {
  path: string;
  field: string;
  message: string;
};

export function throwDiagnostics(diagnostics: Diagnostic[]): never {
  throw new Error(
    diagnostics
      .map(
        (diagnostic) =>
          `${diagnostic.path}: ${diagnostic.field}: ${diagnostic.message}`,
      )
      .join("\nerror: "),
  );
}

export function compareDiagnostics(
  left: Diagnostic,
  right: Diagnostic,
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
