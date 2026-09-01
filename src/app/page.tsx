import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { GAME_CATALOG } from "@/lib/games";
import { auth } from "@/server/auth";

const STEPS = [
  {
    title: "Build a profile",
    body: "Your games, roles, current rank, region, languages and the hours you actually play.",
  },
  {
    title: "Drop into the queue",
    body: "Pick a game and wait. Watch the queue fill in real time across every open tab.",
  },
  {
    title: "Get a squad that fits",
    body: "A matchmaking engine groups you by skill, region and schedule — constraints relax the longer you wait, so nobody gets stuck.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20 sm:py-28">
      <p className="text-muted font-mono text-sm">squadup</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Matchmaking for people, not lobbies.
      </h1>
      <p className="text-muted mt-4 max-w-xl text-lg">
        Set your games, roles, rank and availability, drop into a queue, and get grouped with
        players who actually fit — then into a lobby with chat and a ready-up.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={session?.user ? "/app" : "/signin"} className={buttonClass("primary", "md")}>
          {session?.user ? "Go to your dashboard" : "Sign in with Discord"}
        </Link>
        <a
          href="https://github.com/jackthecoder17/squadup"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("secondary", "md")}
        >
          Source on GitHub
        </a>
      </div>

      <ol className="border-border mt-16 space-y-6 border-t pt-10">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="border-border text-muted flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-muted mt-0.5 text-sm">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="text-muted mt-12 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {GAME_CATALOG.map((game) => (
          <span key={game.slug}>{game.name}</span>
        ))}
      </div>
    </main>
  );
}
