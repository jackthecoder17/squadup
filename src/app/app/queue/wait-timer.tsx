"use client";

import { useEffect, useState } from "react";

import { waitLabel } from "@/lib/queue";

export function WaitTimer({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono tabular-nums">{waitLabel(now - since)}</span>;
}
