"use client";

import { useEffect, useState } from "react";

import { waitLabel } from "@/lib/queue";

export function WaitTimer({ since }: { since: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  return (
    <span className="font-mono tabular-nums">
      {now === null ? waitLabel(0) : waitLabel(now - since)}
    </span>
  );
}
