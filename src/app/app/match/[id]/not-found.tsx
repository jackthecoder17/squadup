import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function MatchNotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <PageHeader
        title="Match not found"
        description="It may have been cancelled, or you're not part of it."
      />
      <Link href="/app/queue" className={buttonClass("primary", "md")}>
        Back to the queue
      </Link>
    </main>
  );
}
