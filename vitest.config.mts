import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Vitest needs to be told about the `@/` alias.
 *
 * Next.js resolves it from `tsconfig.json`; Vitest does not read that file, so
 * without this the tests fail on an import the editor and `tsc` both accept.
 * Declared once here rather than avoided by writing relative paths in tests,
 * because a test that imports differently from the code it covers is a test
 * that can pass while the application cannot resolve the same module.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
