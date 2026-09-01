"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/app", label: "Home" },
  { href: "/app/queue", label: "Queue" },
  { href: "/app/dashboard", label: "Live" },
  { href: "/app/profile", label: "Profile" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground bg-zinc-100 dark:bg-zinc-900"
                : "hover:text-foreground text-zinc-500",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
