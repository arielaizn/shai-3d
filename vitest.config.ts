import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `@/…` is the path alias in tsconfig.json. Without it here, any test that touches
  // a module under `src/` fails to resolve at import time rather than at type check,
  // which looks like a missing package. Tests under `convex/` are unaffected.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: [
      "convex/**/__tests__/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
      // co-located unit tests, e.g. src/lib/whatsapp.test.ts
      "src/**/*.test.ts",
    ],
    exclude: ["node_modules/**", ".next/**"],
    environment: "node",
  },
});
