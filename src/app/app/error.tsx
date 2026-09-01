"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <PageHeader title="Something broke" description="That page hit an error on our side." />
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
