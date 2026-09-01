"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { LobbyError } from "@/lib/match-lobby";
import { auth } from "@/server/auth";
import * as lobby from "@/server/match/service";

export type LobbyResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user.id;
}

async function guard(fn: () => Promise<void>): Promise<LobbyResult> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    if (error instanceof LobbyError) return { ok: false, error: error.message };
    throw error;
  }
}

const messageSchema = z.string().min(1).max(2000);
const ratingSchema = z.union([z.literal(1), z.literal(-1)]);

export async function sendMessageAction(matchId: string, body: unknown): Promise<LobbyResult> {
  const userId = await requireUserId();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Message can't be empty." };
  return guard(() => lobby.sendMessage(matchId, userId, parsed.data));
}

export async function setReadyAction(matchId: string, ready: boolean): Promise<LobbyResult> {
  const userId = await requireUserId();
  return guard(() => lobby.setReady(matchId, userId, ready));
}

export async function launchAction(matchId: string): Promise<LobbyResult> {
  const userId = await requireUserId();
  return guard(() => lobby.launch(matchId, userId));
}

export async function finishAction(matchId: string): Promise<LobbyResult> {
  const userId = await requireUserId();
  return guard(() => lobby.finish(matchId, userId));
}

export async function leaveLobbyAction(matchId: string): Promise<LobbyResult> {
  const userId = await requireUserId();
  const result = await guard(() => lobby.leaveLobby(matchId, userId));
  if (result.ok) redirect("/app/queue");
  return result;
}

export async function rateAction(
  matchId: string,
  toUserId: string,
  value: unknown,
): Promise<LobbyResult> {
  const userId = await requireUserId();
  const parsed = ratingSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "Invalid rating." };
  return guard(() => lobby.rateTeammate(matchId, userId, toUserId, parsed.data));
}
