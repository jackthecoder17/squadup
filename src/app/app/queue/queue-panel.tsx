"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { joinQueueAction, leaveQueueAction } from "@/server/queue/actions";

import { useQueueStream, type QueueStreamInit } from "./use-queue-stream";
import { WaitTimer } from "./wait-timer";

type GameOption = { slug: string; name: string; shortName: string };

const STATUS = {
  connecting: { tone: "pending", label: "Connecting…" },
  live: { tone: "live", label: "Live" },
  reconnecting: { tone: "off", label: "Reconnecting…" },
} as const;

export function QueuePanel({
  userId,
  games,
  initial,
}: {
  userId: string;
  games: GameOption[];
  initial: QueueStreamInit;
}) {
  const { status, online, queues, tickets, matches, setTicket } = useQueueStream(userId, initial);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(
    slug: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    after: () => void,
  ) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await action();
      if (result.ok) after();
      else setError(result.error ?? "Something went wrong.");
      setPendingSlug(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          <span className="text-foreground font-medium tabular-nums">{online}</span> online
        </span>
        <StatusDot tone={STATUS[status].tone} label={STATUS[status].label} />
      </div>

      {games.length === 0 ? (
        <EmptyState
          title="No games on your profile yet"
          description="Add a game with a rank and a role, then come back to queue."
          action={
            <Link href="/app/profile/edit" className={buttonClass("primary", "sm")}>
              Edit profile
            </Link>
          }
        />
      ) : (
        <ul className="divide-border border-border divide-y rounded-xl border">
          {games.map((game) => {
            const size = queues[game.slug] ?? 0;
            const queuedAt = tickets[game.slug];
            const isQueued = queuedAt !== undefined;
            const matchId = matches[game.slug];
            const busy = pendingSlug === game.slug;

            return (
              <li key={game.slug} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{game.name}</p>
                  <p className="text-muted text-sm tabular-nums">
                    {matchId ? (
                      "Match found"
                    ) : (
                      <>
                        {size} in queue
                        {isQueued ? (
                          <>
                            {" · "}
                            <WaitTimer since={queuedAt} />
                          </>
                        ) : null}
                      </>
                    )}
                  </p>
                </div>

                {matchId ? (
                  <Link
                    href={`/app/match/${matchId}`}
                    className={buttonClass("accent", "sm") + " shrink-0"}
                  >
                    Open lobby
                  </Link>
                ) : isQueued ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={busy}
                    onClick={() =>
                      run(
                        game.slug,
                        () => leaveQueueAction(game.slug),
                        () => setTicket(game.slug, null),
                      )
                    }
                  >
                    {busy ? "…" : "Leave"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={busy}
                    onClick={() =>
                      run(
                        game.slug,
                        () => joinQueueAction(game.slug),
                        () => setTicket(game.slug, Date.now()),
                      )
                    }
                  >
                    {busy ? "…" : "Find a squad"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="bg-danger-surface text-danger rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      <p className="text-muted text-sm">
        The match engine runs as a separate worker. When enough compatible players are queued it
        forms a lobby, and everyone here sees it live.
      </p>
    </div>
  );
}
