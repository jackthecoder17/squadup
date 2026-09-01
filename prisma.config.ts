import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads `url` from schema.prisma or auto-loads `.env`.
// The CLI (migrate / studio / introspect) gets its connection from here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
