import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { GAME_CATALOG } from "../src/lib/games";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  for (const game of GAME_CATALOG) {
    await db.game.upsert({
      where: { slug: game.slug },
      create: {
        slug: game.slug,
        name: game.name,
        shortName: game.shortName,
        roles: [...game.roles],
        ranks: [...game.ranks],
      },
      update: {
        name: game.name,
        shortName: game.shortName,
        roles: [...game.roles],
        ranks: [...game.ranks],
      },
    });
  }
  console.log(`Seeded ${GAME_CATALOG.length} games.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
