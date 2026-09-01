import Link from "next/link";
import { redirect } from "next/navigation";

import type { WizardData } from "@/app/onboarding/types";
import { minutesToHHMM } from "@/lib/availability";
import type { Region } from "@/lib/regions";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app/profile/edit");

  const profile = await getProfile(session.user.id);
  if (!profile) redirect("/onboarding");

  const initial: WizardData = {
    displayName: profile.displayName,
    region: profile.region as Region,
    languages: profile.languages,
    bio: profile.bio ?? "",
    timezone: profile.timezone,
    games: profile.games.map((g) => ({
      slug: g.game.slug,
      roles: g.roles,
      rank: g.rank,
      playStyle: g.playStyle,
    })),
    windows: profile.availability.map((w) => ({
      id: w.id,
      dayOfWeek: w.dayOfWeek,
      start: minutesToHHMM(w.startMinute),
      end: minutesToHHMM(w.endMinute),
    })),
  };

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
        </div>
        <Link
          href="/app/profile"
          className="hover:text-foreground text-sm font-medium text-zinc-500"
        >
          Done
        </Link>
      </div>

      <ProfileEditor initial={initial} />
    </main>
  );
}
