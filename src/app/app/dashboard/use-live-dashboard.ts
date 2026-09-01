"use client";

import { useEffect, useState } from "react";

import type { StreamEvent } from "@/lib/sse";

export type FeedMatch = {
  id: string;
  gameSlug: string;
  region: string;
  rankSpread: number;
  size: number;
  createdAt: string;
};

export type DashboardState = {
  status: "connecting" | "live" | "reconnecting";
  online: number;
  queues: Record<string, number>;
  feed: FeedMatch[];
};

export type DashboardInit = Omit<DashboardState, "status">;

export function useLiveDashboard(initial: DashboardInit): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: "connecting", ...initial });

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
            return { ...prev, status: "live", online: parsed.online, queues: parsed.queues };
          case "queue":
            return { ...prev, queues: { ...prev.queues, [parsed.gameSlug]: parsed.size } };
          case "presence":
            return { ...prev, online: parsed.online };
          case "match":
            return {
              ...prev,
              feed: [
                {
                  id: parsed.matchId,
                  gameSlug: parsed.gameSlug,
                  region: parsed.region,
                  rankSpread: parsed.rankSpread,
                  size: parsed.userIds.length,
                  createdAt: new Date().toISOString(),
                },
                ...prev.feed,
              ].slice(0, 20),
            };
          default:
            return prev;
        }
      });
    };
    return () => source.close();
  }, []);

  return state;
}
