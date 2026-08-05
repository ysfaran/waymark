import type { Configuration } from "../configuration/index.js";
import type { WaymarkDocument } from "./scan.js";

type FilterableDocument = {
  kind: string;
  tags: string[];
};

type MetadataCriteria =
  | {
      method: "filter-groups";
      kinds: Set<string>;
      tags: Set<string>;
      requiredTags: Set<string>;
    }
  | {
      method: "filter-expression";
      expression: string;
    };

type DocumentCriteria = {
  metadata: MetadataCriteria;
  query?: string;
};

type FilterNode =
  | { type: "kind"; identifier: string }
  | { type: "tag"; identifier: string }
  | { type: "not"; operand: FilterNode }
  | { type: "and"; left: FilterNode; right: FilterNode }
  | { type: "or"; left: FilterNode; right: FilterNode };

type Token =
  | { type: "kind"; identifier: string; position: number }
  | { type: "tag"; identifier: string; position: number }
  | {
      type: "not" | "and" | "or" | "left-parenthesis" | "right-parenthesis";
      position: number;
    };

export function filterDocuments({
  documents,
  configuration,
  criteria,
}: {
  documents: WaymarkDocument[];
  configuration: Configuration;
  criteria: DocumentCriteria;
}): WaymarkDocument[] {
  const metadata = criteria.metadata;
  const matchesMetadata =
    metadata.method === "filter-expression"
      ? parseMetadataFilter({
          expression: metadata.expression,
          declaredKinds: new Set(configuration.kinds.keys()),
          declaredTags: new Set(configuration.tags.keys()),
        })
      : (document: FilterableDocument) =>
          (metadata.kinds.size === 0 || metadata.kinds.has(document.kind)) &&
          (metadata.tags.size === 0 ||
            document.tags.some((tag) => metadata.tags.has(tag))) &&
          [...metadata.requiredTags].every((tag) =>
            document.tags.includes(tag),
          );
  const normalizedQuery = criteria.query?.toLowerCase();

  return documents
    .filter(
      (document) =>
        matchesMetadata(document) &&
        (normalizedQuery === undefined ||
          document.body.toLowerCase().includes(normalizedQuery)),
    )
    .sort((left, right) => compareText(left.path, right.path));
}

export function parseMetadataFilter({
  expression,
  declaredKinds,
  declaredTags,
}: {
  expression: string;
  declaredKinds: Set<string>;
  declaredTags: Set<string>;
}): (document: FilterableDocument) => boolean {
  const tokens = tokenize(expression, declaredKinds, declaredTags);
  let nextTokenIndex = 0;

  function peek(): Token | undefined {
    return tokens[nextTokenIndex];
  }

  function consume(): Token {
    const token = tokens[nextTokenIndex];
    if (!token) {
      throw syntaxError(
        expression.length,
        'Expected a kind: or tag: predicate, or "(".',
      );
    }
    nextTokenIndex += 1;
    return token;
  }

  function parsePrimary(): FilterNode {
    const token = consume();
    if (token.type === "kind" || token.type === "tag") {
      return {
        type: token.type,
        identifier: token.identifier,
      };
    }
    if (token.type === "left-parenthesis") {
      const expressionNode = parseOr();
      const closingToken = peek();
      if (closingToken?.type !== "right-parenthesis") {
        throw syntaxError(
          closingToken?.position ?? expression.length,
          'Expected ")".',
        );
      }
      consume();
      return expressionNode;
    }

    throw syntaxError(
      token.position,
      'Expected a kind: or tag: predicate, or "(".',
    );
  }

  function parseNot(): FilterNode {
    if (peek()?.type !== "not") return parsePrimary();
    consume();
    return { type: "not", operand: parseNot() };
  }

  function parseAnd(): FilterNode {
    let node = parseNot();
    while (peek()?.type === "and") {
      consume();
      node = { type: "and", left: node, right: parseNot() };
    }
    return node;
  }

  function parseOr(): FilterNode {
    let node = parseAnd();
    while (peek()?.type === "or") {
      consume();
      node = { type: "or", left: node, right: parseAnd() };
    }
    return node;
  }

  if (tokens.length === 0) {
    throw syntaxError(0, "Expression cannot be empty.");
  }

  const root = parseOr();
  const remainingToken = peek();
  if (remainingToken) {
    const message =
      remainingToken.type === "kind" ||
      remainingToken.type === "tag" ||
      remainingToken.type === "not" ||
      remainingToken.type === "left-parenthesis"
        ? "Expected AND or OR before this token."
        : `Unexpected ${describeToken(remainingToken)}.`;
    throw syntaxError(remainingToken.position, message);
  }

  return (document) => evaluate(root, document);
}

function tokenize(
  expression: string,
  declaredKinds: Set<string>,
  declaredTags: Set<string>,
): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < expression.length) {
    if (/\s/.test(expression[position] ?? "")) {
      position += 1;
      continue;
    }

    if (expression[position] === "(") {
      tokens.push({ type: "left-parenthesis", position });
      position += 1;
      continue;
    }
    if (expression[position] === ")") {
      tokens.push({ type: "right-parenthesis", position });
      position += 1;
      continue;
    }

    const tokenPosition = position;
    while (
      position < expression.length &&
      !/\s|\(|\)/.test(expression[position] ?? "")
    ) {
      position += 1;
    }
    const value = expression.slice(tokenPosition, position);
    const operator = value.toUpperCase();
    if (operator === "NOT") {
      tokens.push({ type: "not", position: tokenPosition });
      continue;
    }
    if (operator === "AND") {
      tokens.push({ type: "and", position: tokenPosition });
      continue;
    }
    if (operator === "OR") {
      tokens.push({ type: "or", position: tokenPosition });
      continue;
    }

    const predicate = /^(kind|tag):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
    if (!predicate) {
      throw syntaxError(
        tokenPosition,
        `Unsupported token "${value}". Expected kind:<identifier>, tag:<identifier>, NOT, AND, OR, or parentheses.`,
      );
    }

    const [, predicateType, identifier] = predicate;
    if (predicateType !== "kind" && predicateType !== "tag") {
      throw new Error("Metadata Filter parser invariant failed.");
    }
    if (!identifier)
      throw new Error("Metadata Filter parser invariant failed.");
    const declarations =
      predicateType === "kind" ? declaredKinds : declaredTags;
    if (!declarations.has(identifier)) {
      throw syntaxError(
        tokenPosition,
        `Undeclared ${predicateType} "${identifier}".`,
      );
    }
    tokens.push({
      type: predicateType,
      identifier,
      position: tokenPosition,
    });
  }

  return tokens;
}

function evaluate(node: FilterNode, document: FilterableDocument): boolean {
  switch (node.type) {
    case "kind":
      return document.kind === node.identifier;
    case "tag":
      return document.tags.includes(node.identifier);
    case "not":
      return !evaluate(node.operand, document);
    case "and":
      return evaluate(node.left, document) && evaluate(node.right, document);
    case "or":
      return evaluate(node.left, document) || evaluate(node.right, document);
  }
}

function syntaxError(position: number, message: string): Error {
  return new Error(
    `Metadata Filter syntax error at position ${position + 1}: ${message}`,
  );
}

function describeToken(token: Token): string {
  if (token.type === "right-parenthesis") return '")"';
  if (token.type === "left-parenthesis") return '"("';
  return `"${token.type.toUpperCase()}"`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
