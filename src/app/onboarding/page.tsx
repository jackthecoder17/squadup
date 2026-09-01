import { redirect } from "next/navigation";

import { isProfileComplete } from "@/lib/profile-completeness";
import { auth } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/onboarding");

  const profile = await getProfile(session.user.id);
  if (isProfileComplete(profile)) redirect("/app/profile");

  return (
    <main className="flex flex-1 flex-col">
      <OnboardingWizard />
    </main>
  );
}
