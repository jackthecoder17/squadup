import Link from "next/link";

import { auth } from "@/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-sm text-zinc-500">squadup</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Find players. Form squads. Queue up.
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Matchmaking for people, not lobbies. Set your games, roles, rank and availability, drop into
        the queue, and get grouped with players who actually fit.
      </p>
      <div>
        <Link
          href={session?.user ? "/app" : "/signin"}
          className="bg-foreground text-background inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
        >
          {session?.user ? "Go to your dashboard" : "Sign in to get started"}
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        Project scaffold — features land branch by branch. See the README for the roadmap.
      </p>
    </main>
  );
}
