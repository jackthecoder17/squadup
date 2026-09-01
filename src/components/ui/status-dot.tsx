import { cn } from "@/lib/cn";

type Tone = "live" | "pending" | "off";

const TONE: Record<Tone, string> = {
  live: "bg-accent",
  pending: "bg-amber-500",
  off: "bg-danger",
};

export function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="text-muted flex items-center gap-2 text-sm">
      <span className={cn("size-2 rounded-full", TONE[tone])} aria-hidden />
      {label}
    </span>
  );
}
