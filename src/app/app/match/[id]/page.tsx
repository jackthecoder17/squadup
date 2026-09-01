import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { regionLabel, type Region } from "@/lib/regions";
import { waitLabel } from "@/lib/queue";
import { auth } from "@/server/auth";
import { displayNameFor, getMatch } from "@/server/match/service";

export const metadata = { title: "Match lobby" };

export default async function MatchPage({ params }: PageProps<"/app/match/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const isPlayer = match.players.some((p) => p.userId === session.user!.id);
  if (!isPlayer) redirect("/app");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">{match.game.name} — squad found</h1>
        </div>
        <Link href="/app/queue" className="hover:text-foreground text-sm font-medium text-zinc-500">
          Back to queue
        </Link>
      </div>

      <p className="mb-6 text-sm text-zinc-500">
        {regionLabel(match.region as Region)} · {match.players.length} players · rank spread{" "}
        {match.rankSpread} · {match.state.toLowerCase()}
      </p>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {match.players.map((player) => (
          <li key={player.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{displayNameFor(player)}</p>
              <p className="text-sm text-zinc-500">
                {player.rank} · {player.roles.join(", ")}
              </p>
            </div>
            <span className="text-sm text-zinc-500">waited {waitLabel(player.waitedMs)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-zinc-500">
        Lobby chat and ready-up arrive in the next phase.
      </p>
    </main>
  );
}
