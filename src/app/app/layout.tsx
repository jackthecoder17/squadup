import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/app");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <AppNav />
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
