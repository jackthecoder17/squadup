import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/app");
  }

  return <>{children}</>;
}
