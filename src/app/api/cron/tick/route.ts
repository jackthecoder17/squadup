import { env } from "@/env";
import { ensureBotPool } from "@/simulator/pool";
import { simulateTick } from "@/simulator/tick";
import { runMatchTick } from "@/worker/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Passes per invocation. Lower it (and maxDuration) if your host caps function
// duration below ~30s. Each pass = one simulate tick + one match tick.
const BURST = Number(process.env.CRON_BURST ?? 8);

/**
 * Stand-in for the long-lived worker + simulator in a serverless deployment.
 * A scheduler (GitHub Actions or Vercel Cron) hits this every few minutes; each
 * call keeps the bot pool warm and runs a short burst of simulate + match
 * passes, advancing a simulated clock so wait-time relaxation still kicks in.
 */
export async function POST(request: Request) {
  if (env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const botIds = await ensureBotPool(env.SIM_BOTS);

  const base = Date.now();
  const totals = { joined: 0, left: 0, resolved: 0, matchesFormed: 0 };
  for (let i = 0; i < BURST; i += 1) {
    const sim = await simulateTick(botIds);
    totals.joined += sim.joined;
    totals.left += sim.left;
    totals.resolved += sim.resolved;
    const passes = await runMatchTick(base + i * 60_000);
    totals.matchesFormed += passes.reduce((n, p) => n + p.matchesFormed, 0);
  }

  return Response.json({ bots: botIds.length, burst: BURST, ...totals });
}

// Vercel Cron issues GET requests.
export const GET = POST;
