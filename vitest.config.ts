import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      
      { find: /^src\
    ],
  },
  test: {
    globals: true,
    pool: "forks", 
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
