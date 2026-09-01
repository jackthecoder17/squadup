import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/app");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-3">
          <AppNav />
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
