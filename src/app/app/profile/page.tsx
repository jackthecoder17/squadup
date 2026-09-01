import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileSummary } from "@/components/profile-summary";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/app/profile");

  const profile = await getProfile(session.user.id);
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <PageHeader
        title="Your profile"
        actions={
          <Link href="/app/profile/edit" className={buttonClass("primary", "sm")}>
            Edit
          </Link>
        }
      />
      <ProfileSummary profile={profile} />
    </main>
  );
}
