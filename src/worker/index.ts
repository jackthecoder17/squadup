import "dotenv/config";

import { db } from "@/server/db";
import { redis } from "@/server/redis";

import { runMatchTick } from "./tick";

const INTERVAL_MS = Number(process.env.MATCH_TICK_MS ?? 3000);

let stopping = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`[worker] match engine up — tick every ${INTERVAL_MS}ms`);

  while (!stopping) {
    const startedAt = Date.now();
    try {
      const results = await runMatchTick();
      const formed = results.reduce((n, r) => n + r.matchesFormed, 0);
      if (formed > 0) {
        console.log(
          `[worker] formed ${formed} match(es):`,
          results.filter((r) => r.matchesFormed > 0),
        );
      }
    } catch (error) {
      console.error("[worker] tick failed", error);
    }
    await sleep(Math.max(0, INTERVAL_MS - (Date.now() - startedAt)));
  }

  await Promise.allSettled([redis.quit(), db.$disconnect()]);
  console.log("[worker] stopped");
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

void main();
