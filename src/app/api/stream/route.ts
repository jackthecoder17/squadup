import { PRESENCE_REFRESH_MS } from "@/lib/queue";
import { formatSSE, SSE_KEEPALIVE } from "@/lib/sse";
import { auth } from "@/server/auth";
import { dropPresence, getPlayerTickets, getSnapshot, touchPresence } from "@/server/queue/service";
import { CHANNEL, createRedisSubscriber } from "@/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Matchmaking event stream. Each client holds one connection; while it's open
 * the client counts as present (TTL refreshed here, no client heartbeat needed),
 * and every queue/presence change published to Redis is forwarded as an SSE
 * frame. Closing the connection reaps presence.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

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
        await subscriber.unsubscribe(CHANNEL).catch(() => {});
        subscriber.disconnect();
        await dropPresence(userId).catch(() => {});
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", cleanup);

      const initialTickets = await getPlayerTickets(userId);
      await touchPresence(userId, initialTickets.length > 0 ? "queued" : "online", {
        announce: true,
      });
      send(formatSSE(await getSnapshot(userId)));

      await subscriber.subscribe(CHANNEL);
      subscriber.on("message", (_channel, payload) => {
        send(`data: ${payload}\n\n`);
      });

      heartbeat = setInterval(() => {
        send(SSE_KEEPALIVE);
        void getPlayerTickets(userId)
          .then((tickets) => touchPresence(userId, tickets.length > 0 ? "queued" : "online"))
          .catch(() => {});
      }, PRESENCE_REFRESH_MS);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      subscriber.disconnect();
      void dropPresence(userId).catch(() => {});
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
