"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { canChat, canLaunch, canLeave, isRateable, type MatchState } from "@/lib/match-lobby";
import type { MatchStreamEvent } from "@/lib/match-stream";
import {
  finishAction,
  launchAction,
  leaveLobbyAction,
  rateAction,
  sendMessageAction,
  setReadyAction,
} from "@/server/match/actions";

type PlayerView = {
  userId: string;
  name: string;
  rank: string;
  roles: string[];
  ready: boolean;
};

type LobbyMessage = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
};

type Props = {
  matchId: string;
  userId: string;
  initial: {
    state: MatchState;
    gameName: string;
    region: string;
    rankSpread: number;
    players: PlayerView[];
    messages: LobbyMessage[];
    myRatings: Record<string, number>;
  };
};

const STATE_LABEL: Record<MatchState, string> = {
  FORMED: "Ready up",
  READY: "Ready to launch",
  LIVE: "Live",
  COMPLETED: "Complete",
  CANCELLED: "Cancelled",
};

export function MatchLobby({ matchId, userId, initial }: Props) {
  const [state, setState] = useState<MatchState>(initial.state);
  const [ready, setReady] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.players.map((p) => [p.userId, p.ready])),
  );
  const [messages, setMessages] = useState<LobbyMessage[]>(initial.messages);
  const [ratings, setRatings] = useState<Record<string, number>>(initial.myRatings);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource(`/api/match/${matchId}/stream`);
    source.onmessage = (event) => {
      let parsed: MatchStreamEvent;
      try {
        parsed = JSON.parse(event.data) as MatchStreamEvent;
      } catch {
        return;
      }
      if (parsed.kind === "message") {
        setMessages((prev) => (prev.some((m) => m.id === parsed.id) ? prev : [...prev, parsed]));
      } else if (parsed.kind === "ready") {
        setReady((prev) => ({ ...prev, [parsed.userId]: parsed.ready }));
      } else if (parsed.kind === "state") {
        setState(parsed.state);
      }
    };
    return () => source.close();
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const readyCount = useMemo(
    () => initial.players.filter((p) => ready[p.userId]).length,
    [ready, initial.players],
  );
  const myReady = ready[userId] ?? false;
  const teammates = initial.players.filter((p) => p.userId !== userId);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) onOk?.();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    act(() => sendMessageAction(matchId, body));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted font-mono text-sm">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {initial.gameName} — {STATE_LABEL[state]}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {initial.region} · {initial.players.length} players · rank spread {initial.rankSpread}
          </p>
        </div>
        {canLeave(state) ? (
          <button
            type="button"
            onClick={() => act(() => leaveLobbyAction(matchId))}
            className="text-muted hover:text-danger shrink-0 text-sm font-medium"
          >
            Leave lobby
          </button>
        ) : null}
      </div>

      {state === "CANCELLED" ? (
        <div className="border-border rounded-xl border p-5 text-sm">
          <p>This match was cancelled — someone left the lobby.</p>
          <Link
            href="/app/queue"
            className="mt-3 inline-block font-medium underline underline-offset-4"
          >
            Back to the queue
          </Link>
        </div>
      ) : null}

      <section>
        <h2 className="text-muted mb-2 text-sm font-semibold">Squad</h2>
        <ul className="divide-border border-border divide-y rounded-xl border">
          {initial.players.map((player) => {
            const isReady = ready[player.userId] ?? false;
            return (
              <li key={player.userId} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {player.name}
                    {player.userId === userId ? " (you)" : ""}
                  </p>
                  <p className="text-muted text-sm">
                    {player.rank} · {player.roles.join(", ")}
                  </p>
                </div>
                {player.userId === userId && canLeave(state) ? (
                  <button
                    type="button"
                    onClick={() => act(() => setReadyAction(matchId, !myReady))}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      myReady
                        ? "bg-accent text-accent-foreground hover:opacity-90"
                        : "border-border hover:bg-surface-muted border",
                    )}
                  >
                    {myReady ? "Ready" : "Ready up"}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium",
                      isReady ? "text-accent" : "text-subtle",
                    )}
                  >
                    {isReady ? "Ready" : "Not ready"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="text-muted mt-3 text-sm">
          {state === "FORMED" ? `${readyCount}/${initial.players.length} ready` : null}
          {state === "READY" ? (
            <button
              type="button"
              onClick={() => act(() => launchAction(matchId))}
              disabled={!canLaunch(state)}
              className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-medium hover:opacity-90"
            >
              Launch match
            </button>
          ) : null}
          {state === "LIVE" ? (
            <button
              type="button"
              onClick={() => act(() => finishAction(matchId))}
              className="border-border hover:bg-surface-muted rounded-full border px-5 py-2 text-sm font-medium"
            >
              Finish match
            </button>
          ) : null}
          {state === "COMPLETED" ? "This match is complete." : null}
        </div>
      </section>

      {isRateable(state) ? (
        <section>
          <h2 className="text-muted mb-2 text-sm font-semibold">Rate your squad</h2>
          <ul className="space-y-2">
            {teammates.map((mate) => {
              const value = ratings[mate.userId];
              return (
                <li key={mate.userId} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">{mate.name}</span>
                  <div className="flex gap-2">
                    {([1, -1] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={value === v}
                        onClick={() =>
                          act(
                            () => rateAction(matchId, mate.userId, v),
                            () => setRatings((prev) => ({ ...prev, [mate.userId]: v })),
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors",
                          value === v
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "border-border hover:bg-surface-muted",
                        )}
                      >
                        {v === 1 ? "👍" : "👎"}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-muted mb-2 text-sm font-semibold">Chat</h2>
        <div className="border-border h-56 overflow-y-auto rounded-xl border p-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-subtle">No messages yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {messages.map((message) => (
                <li key={message.id}>
                  <span
                    className={cn(
                      "font-medium",
                      message.userId === userId ? "text-foreground" : "text-muted",
                    )}
                  >
                    {message.name}:
                  </span>{" "}
                  <span className="break-words">{message.body}</span>
                </li>
              ))}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!canChat(state)}
            placeholder={canChat(state) ? "Message your squad…" : "Chat is closed"}
            maxLength={500}
            className="border-border focus:border-ring flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canChat(state) || draft.trim().length === 0}
            className="bg-primary text-primary-foreground rounded-lg px-4 text-sm font-medium disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </section>

      {error ? (
        <p className="bg-danger-surface text-danger rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}
    </div>
  );
}
