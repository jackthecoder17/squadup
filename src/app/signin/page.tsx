import { signIn } from "@/server/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <div className="space-y-2 text-center">
        <p className="text-muted font-mono text-sm">squadup</p>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted text-sm">We use Discord — it&apos;s where gamers already are.</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo: callbackUrl ?? "/app" });
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
        >
          Continue with Discord
        </button>
      </form>
    </main>
  );
}
