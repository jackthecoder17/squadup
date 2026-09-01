import { formatSSE, SSE_KEEPALIVE } from "@/lib/sse";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { createRedisSubscriber, matchChannel } from "@/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Per-match event stream: lobby chat, ready toggles, and state transitions. */
export async function GET(_request: Request, { params }: RouteContext<"/api/match/[id]/stream">) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const player = await db.matchPlayer.findUnique({
    where: { matchId_userId: { matchId: id, userId: session.user.id } },
    select: { id: true },
  });
  if (!player) return new Response("Forbidden", { status: 403 });

  // Current state, so a reconnect (serverless streams are time-capped) re-syncs.
  const match = await db.match.findUniqueOrThrow({
    where: { id },
    select: { state: true, players: { select: { userId: true, ready: true } } },
  });

  const channel = matchChannel(id);
  const subscriber = createRedisSubscriber();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        subscriber.removeAllListeners("message");
        await subscriber.unsubscribe(channel).catch(() => {});
        subscriber.disconnect();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      _request.signal.addEventListener("abort", cleanup);

      send(formatSSE({ kind: "state", state: match.state }));
      for (const p of match.players) {
        send(formatSSE({ kind: "ready", userId: p.userId, ready: p.ready }));
      }
      await subscriber.subscribe(channel);
      subscriber.on("message", (_channel, payload) => {
        send(`data: ${payload}\n\n`);
      });

      heartbeat = setInterval(() => send(SSE_KEEPALIVE), 25_000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
