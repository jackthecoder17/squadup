import { defineConfig } from "vitest/config";

/**
 * Integration tests (`*.int.test.ts`) — real Postgres + Redis, Node environment.
 * Run with `pnpm test:int`; needs `pnpm db:up`. Kept out of the fast `pnpm test`
 * loop and the pre-push hook.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
