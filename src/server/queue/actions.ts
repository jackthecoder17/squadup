"use server";

import { redirect } from "next/navigation";

import { isGameSlug } from "@/lib/games";
import { buildTicket, QueueError } from "@/lib/queue";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";
import * as queue from "@/server/queue/service";

export type QueueResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/app/queue");
  return session.user.id;
}

export async function joinQueueAction(gameSlug: string): Promise<QueueResult> {
  const userId = await requireUserId();
  if (!isGameSlug(gameSlug)) return { ok: false, error: "Unknown game." };

  const profile = await getProfile(userId);
  if (!profile) return { ok: false, error: "Finish setting up your profile first." };

  try {
    await queue.joinQueue(buildTicket(userId, profile, gameSlug));
  } catch (error) {
    if (error instanceof QueueError) return { ok: false, error: error.message };
    throw error;
  }

  return { ok: true };
}

export async function leaveQueueAction(gameSlug: string): Promise<QueueResult> {
  const userId = await requireUserId();
  if (!isGameSlug(gameSlug)) return { ok: false, error: "Unknown game." };

  await queue.leaveQueue(userId, gameSlug);
  return { ok: true };
}
