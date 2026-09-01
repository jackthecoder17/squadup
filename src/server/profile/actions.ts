"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  availabilitySchema,
  basicsSchema,
  gameEntrySchema,
  gamesSchema,
  onboardingSchema,
} from "@/lib/profile-schema";
import { auth } from "@/server/auth";
import * as profileService from "@/server/profile/service";

export type ActionResult = { ok: true } | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That didn't look right. Check the form and try again.";
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/onboarding");
  return session.user.id;
}

export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await profileService.completeOnboarding(userId, parsed.data);
  revalidatePath("/app");
  redirect("/app");
}

export async function updateBasicsAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await profileService.updateBasics(userId, parsed.data);
  revalidatePath("/app/profile");
  return { ok: true };
}

export async function upsertGameProfileAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = gameEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await profileService.upsertGameProfile(userId, parsed.data);
  revalidatePath("/app/profile");
  return { ok: true };
}

export async function replaceGamesAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = gamesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await profileService.replaceGames(userId, parsed.data);
  revalidatePath("/app/profile");
  return { ok: true };
}

export async function removeGameProfileAction(gameSlug: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await profileService.removeGameProfile(userId, gameSlug);
  revalidatePath("/app/profile");
  return { ok: true };
}

export async function replaceAvailabilityAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await profileService.replaceAvailability(userId, parsed.data);
  revalidatePath("/app/profile");
  return { ok: true };
}
