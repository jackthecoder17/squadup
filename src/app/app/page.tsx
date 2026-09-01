import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isProfileComplete } from "@/lib/profile-completeness";
import { auth } from "@/server/auth";
import { getActiveMatchForUser } from "@/server/match/service";
import { getProfile } from "@/server/profile/service";

export default async function AppHome() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app");

  const profile = await getProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect("/onboarding");

  const activeMatch = await getActiveMatchForUser(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <PageHeader title={`Welcome, ${profile!.displayName}.`} />

      {activeMatch ? (
        <Card className="mb-4 p-5">
          <p className="font-medium">You&apos;re in a {activeMatch.game.name} lobby.</p>
          <p className="text-muted mt-1 text-sm">
            {activeMatch.players.length} players · {activeMatch.state.toLowerCase()}
          </p>
          <Link
            href={`/app/match/${activeMatch.id}`}
            className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
          >
            Open the lobby
          </Link>
        </Card>
      ) : null}

      <Card className="p-5">
        <p className="text-muted text-sm">Your profile is ready.</p>
        <p className="mt-1 text-sm tabular-nums">
          {profile!.games.length} game{profile!.games.length === 1 ? "" : "s"} ·{" "}
          {profile!.availability.length} availability window
          {profile!.availability.length === 1 ? "" : "s"}
        </p>
        <div className="mt-4 flex gap-4 text-sm font-medium">
          <Link href="/app/queue" className="underline underline-offset-4">
            Go to the queue
          </Link>
          <Link href="/app/profile" className="underline underline-offset-4">
            View &amp; edit profile
          </Link>
        </div>
      </Card>

      <p className="text-muted mt-6 text-sm">
        Queue for a game, then watch the{" "}
        <Link href="/app/dashboard" className="underline underline-offset-4">
          live dashboard
        </Link>{" "}
        as squads form.
      </p>
    </main>
  );
}
