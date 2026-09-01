import "dotenv/config";

import { db } from "@/server/db";
import { redis } from "@/server/redis";

import { ensureBotPool } from "./pool";
import { simulateTick } from "./tick";

const BOT_COUNT = Number(process.env.SIM_BOTS ?? 60);
const TICK_MS = Number(process.env.SIM_TICK_MS ?? 2500);

let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`[sim] ensuring ${BOT_COUNT} bots…`);
  const botIds = await ensureBotPool(BOT_COUNT);
  console.log(`[sim] ${botIds.length} bots ready — tick every ${TICK_MS}ms`);
  console.log("[sim] run `pnpm worker` alongside this to see matches form");

  while (!stopping) {
    const startedAt = Date.now();
    try {
      const result = await simulateTick(botIds);
      if (result.joined || result.left || result.resolved) {
        console.log(
          `[sim] +${result.joined} queued  -${result.left} left  ✓${result.resolved} resolved`,
        );
      }
    } catch (error) {
      console.error("[sim] tick failed", error);
    }
    await sleep(Math.max(0, TICK_MS - (Date.now() - startedAt)));
  }

  await Promise.allSettled([redis.quit(), db.$disconnect()]);
  console.log("[sim] stopped");
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

void main();
