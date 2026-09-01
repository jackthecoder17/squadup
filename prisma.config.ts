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
    // Migrations and seeding need a direct (non-pooled) connection. Falls back
    // to DATABASE_URL when they're the same, which is the local case.
    url: process.env.DIRECT_DATABASE_URL ?? env("DATABASE_URL"),
  },
});
