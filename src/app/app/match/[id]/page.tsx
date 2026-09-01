import { notFound, redirect } from "next/navigation";

import { regionLabel, type Region } from "@/lib/regions";
import { auth } from "@/server/auth";
import { displayNameFor, getMatch, getMessages, getMyRatings } from "@/server/match/service";

import { MatchLobby } from "./match-lobby";

export const metadata = { title: "Match lobby" };

export default async function MatchPage({ params }: PageProps<"/app/match/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  if (!match.players.some((p) => p.userId === userId)) redirect("/app");

  const [messages, myRatings] = await Promise.all([getMessages(id), getMyRatings(id, userId)]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <MatchLobby
        matchId={id}
        userId={userId}
        initial={{
          state: match.state,
          gameName: match.game.name,
          region: regionLabel(match.region as Region),
          rankSpread: match.rankSpread,
          players: match.players.map((p) => ({
            userId: p.userId,
            name: displayNameFor(p),
            rank: p.rank,
            roles: p.roles,
            ready: p.ready,
          })),
          messages,
          myRatings,
        }}
      />
    </main>
  );
}
