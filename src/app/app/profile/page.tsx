import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileSummary } from "@/components/profile-summary";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app/profile");

  const profile = await getProfile(session.user.id);
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/app" className="hover:text-foreground text-zinc-500">
            Back
          </Link>
          <Link
            href="/app/profile/edit"
            className="bg-foreground text-background rounded-full px-4 py-1.5"
          >
            Edit
          </Link>
        </div>
      </div>

      <ProfileSummary profile={profile} />
    </main>
  );
}
