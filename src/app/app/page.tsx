import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/server/auth";

export default async function AppHome() {
  // Layout already guarantees a session; re-read it for the user's data.
  const session = await auth();
  const user = session!.user;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-zinc-500">squadup</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user.name ?? "player"}.
          </h1>
        </div>
        <SignOutButton />
      </div>
      <p className="text-sm text-zinc-500">
        Signed in as {user.email ?? user.id}. Profiles, queueing, and matchmaking land in later
        phases.
      </p>
    </main>
  );
}
