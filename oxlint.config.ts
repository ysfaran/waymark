import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript"],
  categories: {
    correctness: "error",
  },
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
});
