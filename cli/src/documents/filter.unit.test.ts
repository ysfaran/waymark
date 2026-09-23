import { expect, test } from "vitest";

import { parseMetadataFilter } from "./filter.js";

test("Boolean Metadata Filters apply NOT before AND before OR", () => {
  const matches = parseMetadataFilter({
    expression: "kind:adr OR kind:guide AND NOT tag:draft",
    declaredScopes: new Set(),
    declaredKinds: new Set(["adr", "guide"]),
    declaredTags: new Set(["draft"]),
  });

  expect([
    matches({ scopes: [], kind: "adr", tags: ["draft"] }),
    matches({ scopes: [], kind: "guide", tags: [] }),
    matches({ scopes: [], kind: "guide", tags: ["draft"] }),
    matches({ scopes: [], kind: "research", tags: [] }),
  ]).toEqual([true, true, false, false]);
});

test("Boolean Metadata Filters apply grouping and case-insensitive operators", () => {
  const matches = parseMetadataFilter({
    expression: "(kind:adr or kind:guide) aNd NoT tag:draft",
    declaredScopes: new Set(),
    declaredKinds: new Set(["adr", "guide"]),
    declaredTags: new Set(["draft"]),
  });

  expect([
    matches({ scopes: [], kind: "adr", tags: [] }),
    matches({ scopes: [], kind: "guide", tags: ["draft"] }),
    matches({ scopes: [], kind: "research", tags: [] }),
  ]).toEqual([true, false, false]);
});

test("Boolean Metadata Filters match flat Document Scope predicates", () => {
  const matches = parseMetadataFilter({
    expression: "scope:backend AND NOT scope:search-service",
    declaredScopes: new Set(["backend", "search-service"]),
    declaredKinds: new Set(),
    declaredTags: new Set(),
  });

  expect([
    matches({ scopes: ["backend"], kind: "guide", tags: [] }),
    matches({
      scopes: ["backend", "search-service"],
      kind: "guide",
      tags: [],
    }),
    matches({ scopes: [], kind: "guide", tags: [] }),
  ]).toEqual([true, false, false]);
});

test.each([
  ["", "position 1: Expression cannot be empty."],
  ["kind:adr tag:react", "position 10: Expected AND or OR before this token."],
  [
    "kind:adr AND",
    'position 13: Expected a scope:, kind:, or tag: predicate, or "(".',
  ],
  ["(kind:adr", 'position 10: Expected ")".'],
  [
    "kind:*",
    'position 1: Unsupported token "kind:*". Expected scope:<identifier>, kind:<identifier>, tag:<identifier>, NOT, AND, OR, or parentheses.',
  ],
  ["kind:missing", 'position 1: Undeclared kind "missing".'],
])(
  "Boolean Metadata Filters report a useful position for invalid expression %j",
  (expression, expectedMessage) => {
    expect(() =>
      parseMetadataFilter({
        expression,
        declaredScopes: new Set(["backend"]),
        declaredKinds: new Set(["adr"]),
        declaredTags: new Set(["react"]),
      }),
    ).toThrow(`Metadata Filter syntax error at ${expectedMessage}`);
  },
);
