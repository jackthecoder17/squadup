"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { regionLabel, type Region } from "@/lib/regions";

import { useLiveDashboard, type DashboardInit } from "./use-live-dashboard";

const STATUS = {
  connecting: { tone: "pending", label: "Connecting…" },
  live: { tone: "live", label: "Live" },
  reconnecting: { tone: "off", label: "Reconnecting…" },
} as const;

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
  // null until mounted so relative times don't differ between SSR and hydration.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const gameName = (slug: string) => games.find((g) => g.slug === slug)?.name ?? slug;
  const totalQueued = Object.values(queues).reduce((sum, n) => sum + n, 0);
  const maxQueue = Math.max(1, ...Object.values(queues));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted font-mono text-sm">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Live</h1>
        </div>
        <StatusDot tone={STATUS[status].tone} label={STATUS[status].label} />
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Online", online],
          ["In queue", totalQueued],
          ["Recent matches", feed.length],
        ].map(([label, value]) => (
          <div key={label} className="border-border rounded-xl border py-4">
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            <dt className="text-muted mt-1 text-xs">{label}</dt>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="text-muted mb-3 text-sm font-semibold">Queues</h2>
        <ul className="space-y-2">
          {games.map((game) => {
            const count = queues[game.slug] ?? 0;
            return (
              <li key={game.slug} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">{game.name}</span>
                <div className="bg-surface-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(count / maxQueue) * 100}%` }}
                  />
                </div>
                <span className="text-muted w-8 shrink-0 text-right tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-muted mb-3 text-sm font-semibold">Matches forming</h2>
        {feed.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Queue up, or run the simulator and worker to see squads form under load."
          />
        ) : (
          <ul className="divide-border border-border divide-y rounded-xl border text-sm">
            {feed.map((match) => (
              <li key={match.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{gameName(match.gameSlug)}</span>
                  <span className="text-muted">
                    {" "}
                    · {regionLabel(match.region as Region)} · {match.size}p · spread{" "}
                    {match.rankSpread}
                  </span>
                </span>
                <span className="text-subtle shrink-0">
                  {now === null ? "" : timeAgo(match.createdAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
