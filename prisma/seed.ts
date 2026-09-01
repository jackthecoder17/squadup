import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { GAME_CATALOG } from "../src/lib/games";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  for (const game of GAME_CATALOG) {
    const fields = {
      name: game.name,
      shortName: game.shortName,
      teamSize: game.teamSize,
      roles: [...game.roles],
      ranks: [...game.ranks],
    };
    await db.game.upsert({
      where: { slug: game.slug },
      create: { slug: game.slug, ...fields },
      update: fields,
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
