import { redirect } from "next/navigation";

import { isProfileComplete } from "@/lib/profile-completeness";
import { auth } from "@/server/auth";
import { getActiveMatchForUser } from "@/server/match/service";
import { getProfile } from "@/server/profile/service";
import { getSnapshot } from "@/server/queue/service";

import { PageHeader } from "@/components/ui/page-header";

import { QueuePanel } from "./queue-panel";

export const metadata = { title: "Queue" };

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app/queue");

  const profile = await getProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect("/onboarding");

  const [snapshot, activeMatch] = await Promise.all([
    getSnapshot(session.user.id),
    getActiveMatchForUser(session.user.id),
  ]);

  const games = profile!.games.map((entry) => ({
    slug: entry.game.slug,
    name: entry.game.name,
    shortName: entry.game.shortName,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <PageHeader title="Queue" description="Pick a game and get grouped with players who fit." />

      <QueuePanel
        userId={session.user.id}
        games={games}
        initial={{
          online: snapshot.online,
          queues: snapshot.queues,
          tickets: Object.fromEntries(snapshot.tickets.map((t) => [t.gameSlug, t.enqueuedAt])),
          matches: activeMatch ? { [activeMatch.game.slug]: activeMatch.id } : {},
        }}
      />
    </main>
  );
}
