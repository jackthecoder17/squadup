import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { isProfileComplete } from "@/lib/profile-completeness";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

export default async function AppHome() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app");

  const profile = await getProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect("/onboarding");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {profile!.displayName}.
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">Your profile is ready.</p>
        <p className="mt-1 text-sm">
          {profile!.games.length} game{profile!.games.length === 1 ? "" : "s"} ·{" "}
          {profile!.availability.length} availability window
          {profile!.availability.length === 1 ? "" : "s"}
        </p>
        <Link
          href="/app/profile"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          View & edit profile
        </Link>
      </div>

      <p className="text-sm text-zinc-500">Queueing and matchmaking arrive in the next phases.</p>
    </main>
  );
}
