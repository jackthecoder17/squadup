import { redirect } from "next/navigation";

import { GAME_CATALOG } from "@/lib/games";
import { auth } from "@/server/auth";
import { getRecentMatches } from "@/server/match/service";
import { getSnapshot } from "@/server/queue/service";

import { LiveDashboard } from "./live-dashboard";

export const metadata = { title: "Live" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app/dashboard");

  const [snapshot, recent] = await Promise.all([getSnapshot(session.user.id), getRecentMatches()]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <LiveDashboard
        games={GAME_CATALOG.map((g) => ({ slug: g.slug, name: g.name }))}
        initial={{
          online: snapshot.online,
          queues: snapshot.queues,
          feed: recent.map((r) => ({
            id: r.id,
            gameSlug: r.gameSlug,
            region: r.region,
            rankSpread: r.rankSpread,
            size: r.size,
            createdAt: r.createdAt,
          })),
        }}
      />
    </main>
  );
}
