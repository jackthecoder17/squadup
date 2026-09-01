"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read the persisted / system theme once on mount. A lazy initializer would
    // run on the server (no localStorage) and mismatch on hydration.
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "dark" || stored === "light" ? stored : systemTheme());
  }, []);

  function toggle() {
    const next: Theme = (theme ?? systemTheme()) === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-muted hover:text-foreground hover:bg-surface-muted shrink-0 rounded-full p-2 transition-colors"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        {theme === "dark" ? (
          <path
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M7.9 16.1l-1.4 1.4m0-11.4 1.4 1.4m8.2 8.2 1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
