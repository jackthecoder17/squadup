import Link from "next/link";

import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="text-muted font-mono text-sm">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page doesn&apos;t exist.</h1>
      <div>
        <Link href="/" className={buttonClass("primary", "md")}>
          Go home
        </Link>
      </div>
    </main>
  );
}
