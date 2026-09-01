/** Shapes pushed over the matchmaking event stream. */
export type StreamEvent =
  | {
      kind: "snapshot";
      queues: Record<string, number>;
      online: number;
      tickets: { gameSlug: string; enqueuedAt: number }[];
    }
  | { kind: "queue"; gameSlug: string; size: number }
  | { kind: "presence"; online: number }
  | { kind: "match"; gameSlug: string; matchId: string; userIds: string[] };

/** Serialize one Server-Sent Event frame. */
export function formatSSE(data: unknown, opts: { event?: string; id?: string } = {}): string {
  let frame = "";
  if (opts.id) frame += `id: ${opts.id}\n`;
  if (opts.event) frame += `event: ${opts.event}\n`;
  frame += `data: ${JSON.stringify(data)}\n\n`;
  return frame;
}

/** Comment frame used as a keep-alive so proxies don't drop an idle stream. */
export const SSE_KEEPALIVE = ": keep-alive\n\n";
