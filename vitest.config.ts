import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      // the source uses bare "src/..." imports (e.g. "src/lib/constant")
      { find: /^src\//, replacement: path.resolve(__dirname, "src") + "/" },
    ],
  },
  test: {
    globals: true,
    pool: "forks", // process.chdir() is not allowed inside worker threads
    environment: "node",
    globalSetup: ["./unit-tests/setup/global.ts"],
    setupFiles: ["./unit-tests/setup/setup.ts"],
    include: ["unit-tests/**/*.test.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/types/**"],
      reporter: ["text", "html"],
    },
  },
});
