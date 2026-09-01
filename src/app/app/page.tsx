import Link from "next/link";
import { redirect } from "next/navigation";

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
      <div>
        <p className="font-mono text-sm text-zinc-500">squadup</p>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {profile!.displayName}.</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">Your profile is ready.</p>
        <p className="mt-1 text-sm">
          {profile!.games.length} game{profile!.games.length === 1 ? "" : "s"} ·{" "}
          {profile!.availability.length} availability window
          {profile!.availability.length === 1 ? "" : "s"}
        </p>
        <div className="mt-4 flex gap-4 text-sm font-medium">
          <Link href="/app/queue" className="underline underline-offset-4">
            Go to the queue
          </Link>
          <Link href="/app/profile" className="underline underline-offset-4">
            View &amp; edit profile
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Drop into a queue to watch it fill in real time. Matching arrives in the next phase.
      </p>
    </main>
  );
}
