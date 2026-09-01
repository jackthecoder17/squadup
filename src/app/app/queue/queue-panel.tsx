"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { joinQueueAction, leaveQueueAction } from "@/server/queue/actions";

import { useQueueStream, type QueueStreamInit } from "./use-queue-stream";
import { WaitTimer } from "./wait-timer";

type GameOption = { slug: string; name: string; shortName: string };

const STATUS_LABEL = {
  connecting: "Connecting…",
  live: "Live",
  reconnecting: "Reconnecting…",
} as const;

export function QueuePanel({ games, initial }: { games: GameOption[]; initial: QueueStreamInit }) {
  const { status, online, queues, tickets, setTicket } = useQueueStream(initial);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function join(slug: string) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await joinQueueAction(slug);
      if (result.ok) setTicket(slug, Date.now());
      else setError(result.error);
      setPendingSlug(null);
    });
  }

  function leave(slug: string) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await leaveQueueAction(slug);
      if (result.ok) setTicket(slug, null);
      else setError(result.error);
      setPendingSlug(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          <span className="text-foreground font-medium">{online}</span> online
        </span>
        <span className="flex items-center gap-2 text-zinc-500">
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
          {STATUS_LABEL[status]}
        </span>
      </div>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {games.map((game) => {
          const size = queues[game.slug] ?? 0;
          const queuedAt = tickets[game.slug];
          const isQueued = queuedAt !== undefined;
          const busy = pendingSlug === game.slug;

          return (
            <li key={game.slug} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{game.name}</p>
                <p className="text-sm text-zinc-500">
                  {size} in queue
                  {isQueued ? (
                    <>
                      {" · "}
                      <WaitTimer since={queuedAt} />
                    </>
                  ) : null}
                </p>
              </div>

              {isQueued ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => leave(game.slug)}
                  className="shrink-0 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {busy ? "…" : "Leave"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => join(game.slug)}
                  className="bg-foreground text-background shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "…" : "Find a squad"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">
        Matching itself lands in the next phase — for now you can watch the queue fill in real time
        across tabs and devices.
      </p>
    </div>
  );
}
