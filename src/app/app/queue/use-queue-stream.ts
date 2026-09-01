"use client";

import { useCallback, useEffect, useState } from "react";

import type { StreamEvent } from "@/lib/sse";

export type ConnectionStatus = "connecting" | "live" | "reconnecting";

export type QueueStreamState = {
  status: ConnectionStatus;
  online: number;
  /** gameSlug -> current queue size */
  queues: Record<string, number>;
  /** gameSlug -> enqueuedAt (ms) for games this client is queued for */
  tickets: Record<string, number>;
};

export type QueueStreamInit = Omit<QueueStreamState, "status">;

export function useQueueStream(initial: QueueStreamInit) {
  const [state, setState] = useState<QueueStreamState>({ status: "connecting", ...initial });

  /** Optimistically reflect this client's own join/leave before the snapshot catches up. */
  const setTicket = useCallback((gameSlug: string, enqueuedAt: number | null) => {
    setState((prev) => {
      const tickets = { ...prev.tickets };
      if (enqueuedAt === null) delete tickets[gameSlug];
      else tickets[gameSlug] = enqueuedAt;
      return { ...prev, tickets };
    });
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.onopen = () => setState((prev) => ({ ...prev, status: "live" }));
    source.onerror = () => setState((prev) => ({ ...prev, status: "reconnecting" }));
    source.onmessage = (event) => {
      let parsed: StreamEvent;
      try {
        parsed = JSON.parse(event.data) as StreamEvent;
      } catch {
        return;
      }
      setState((prev) => {
        switch (parsed.kind) {
          case "snapshot":
            return {
              status: "live",
              online: parsed.online,
              queues: parsed.queues,
              tickets: Object.fromEntries(parsed.tickets.map((t) => [t.gameSlug, t.enqueuedAt])),
            };
          case "queue":
            return {
              ...prev,
              queues: { ...prev.queues, [parsed.gameSlug]: parsed.size },
            };
          case "presence":
            return { ...prev, online: parsed.online };
          default:
            return prev;
        }
      });
    };

    return () => source.close();
  }, []);

  return { ...state, setTicket };
}
