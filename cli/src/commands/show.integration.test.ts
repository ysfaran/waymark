import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { integrationTest, runWaymark } from "../cli-test-fixture.js";

integrationTest(
  "show lists declared scopes, kinds, and tags with descriptions and usage counts",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeVocabularyFixture(repositoryPath);

    const result = runWaymark({
      arguments: ["show"],
      workingDirectoryPath: repositoryPath,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      "Scopes:\n" +
        "  backend — Backend services (2 documents)\n" +
        "  frontend — Frontend applications (0 documents)\n" +
        "  search-service — Search service (2 documents)\n" +
        "Kinds:\n" +
        "  adr — Architecture decisions (1 document)\n" +
        "  guide — Guides (3 documents)\n" +
        "  research — Research (0 documents)\n" +
        "Tags:\n" +
        "  architecture — Architecture (2 documents)\n" +
        "  typescript — TypeScript (2 documents)\n" +
        "  unused — Unused (0 documents)\n",
    );
    expect(result.stderr).toBe("");
  },
);

integrationTest(
  "show narrows categories and kind or tag usage to documents in selected scopes",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeVocabularyFixture(repositoryPath);

    const kindsResult = runWaymark({
      arguments: ["show", "kinds", "--scopes", "backend"],
      workingDirectoryPath: repositoryPath,
    });
    const tagsResult = runWaymark({
      arguments: ["show", "tags", "--scopes", "backend,search-service"],
      workingDirectoryPath: repositoryPath,
    });
    const scopesResult = runWaymark({
      arguments: ["show", "scopes"],
      workingDirectoryPath: repositoryPath,
    });

    expect(kindsResult.status).toBe(0);
    expect(kindsResult.stdout).toBe(
      "Kinds:\n" +
        "  adr — Architecture decisions (1 document)\n" +
        "  guide — Guides (1 document)\n",
    );
    expect(kindsResult.stderr).toBe("");
    expect(tagsResult.status).toBe(0);
    expect(tagsResult.stdout).toBe(
      "Tags:\n" +
        "  architecture — Architecture (2 documents)\n" +
        "  typescript — TypeScript (2 documents)\n",
    );
    expect(tagsResult.stderr).toBe("");
    expect(scopesResult.status).toBe(0);
    expect(scopesResult.stdout).toBe(
      "Scopes:\n" +
        "  backend — Backend services (2 documents)\n" +
        "  frontend — Frontend applications (0 documents)\n" +
        "  search-service — Search service (2 documents)\n",
    );
    expect(scopesResult.stderr).toBe("");
  },
);

integrationTest(
  "show rejects undeclared and duplicate scope selections",
  async ({ temporaryRepositoryPath: repositoryPath }) => {
    await writeVocabularyFixture(repositoryPath);

    const undeclaredResult = runWaymark({
      arguments: ["show", "kinds", "--scopes", "missing"],
      workingDirectoryPath: repositoryPath,
    });
    const duplicateResult = runWaymark({
      arguments: ["show", "tags", "--scopes", "backend", "--scopes", "backend"],
      workingDirectoryPath: repositoryPath,
    });

    expect(undeclaredResult.status).toBe(1);
    expect(undeclaredResult.stderr).toBe(
      'error: --scopes contains undeclared scope "missing".\n',
    );
    expect(duplicateResult.status).toBe(1);
    expect(duplicateResult.stderr).toBe(
      'error: --scopes contains duplicate identifier "backend".\n',
    );
  },
);

async function writeVocabularyFixture(repositoryPath: string): Promise<void> {
  await writeFile(
    join(repositoryPath, "waymark.yaml"),
    "scopes:\n" +
      "  backend: Backend services\n" +
      "  frontend: Frontend applications\n" +
      "  search-service: Search service\n" +
      "kinds:\n" +
      "  adr: Architecture decisions\n" +
      "  guide: Guides\n" +
      "  research: Research\n" +
      "tags:\n" +
      "  architecture: Architecture\n" +
      "  typescript: TypeScript\n" +
      "  unused: Unused\n",
    "utf8",
  );

  const documents = [
    ["backend-adr.md", "adr", "[backend]", "[architecture]"],
    ["search-guide.md", "guide", "[search-service]", "[typescript]"],
    [
      "shared-guide.md",
      "guide",
      "[backend, search-service]",
      "[architecture, typescript]",
    ],
    ["unscoped-guide.md", "guide", "[]", "[]"],
  ] as const;
  for (const [path, kind, scopes, tags] of documents) {
    await writeFile(
      join(repositoryPath, path),
      `---\nkind: ${kind}\ndescription: ${path}\nscopes: ${scopes}\ntags: ${tags}\n---\n`,
      "utf8",
    );
  }
}
