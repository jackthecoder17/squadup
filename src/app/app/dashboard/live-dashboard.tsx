"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { regionLabel, type Region } from "@/lib/regions";

import { useLiveDashboard, type DashboardInit } from "./use-live-dashboard";

type GameOption = { slug: string; name: string };

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function LiveDashboard({ games, initial }: { games: GameOption[]; initial: DashboardInit }) {
  const { status, online, queues, feed } = useLiveDashboard(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const gameName = (slug: string) => games.find((g) => g.slug === slug)?.name ?? slug;
  const totalQueued = Object.values(queues).reduce((sum, n) => sum + n, 0);
  const maxQueue = Math.max(1, ...Object.values(queues));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Live</h1>
        </div>
        <span className="flex items-center gap-2 text-sm text-zinc-500">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "live"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
          />
          {status === "live" ? "Live" : status === "connecting" ? "Connecting…" : "Reconnecting…"}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Online", online],
          ["In queue", totalQueued],
          ["Recent matches", feed.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-200 py-4 dark:border-zinc-800">
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            <dt className="mt-1 text-xs text-zinc-500">{label}</dt>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Queues</h2>
        <ul className="space-y-2">
          {games.map((game) => {
            const count = queues[game.slug] ?? 0;
            return (
              <li key={game.slug} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">{game.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <div
                    className="bg-foreground h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(count / maxQueue) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-zinc-500 tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Matches forming</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing yet — start the simulator and worker.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            {feed.map((match) => (
              <li key={match.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{gameName(match.gameSlug)}</span>
                  <span className="text-zinc-500">
                    {" "}
                    · {regionLabel(match.region as Region)} · {match.size}p · spread{" "}
                    {match.rankSpread}
                  </span>
                </span>
                <span className="shrink-0 text-zinc-400">{timeAgo(match.createdAt, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
