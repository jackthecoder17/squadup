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
    <nav className="flex w-max gap-0.5">
      {LINKS.map((link) => {
        const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
