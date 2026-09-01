import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="text-muted text-xs">{hint}</p> : null}
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ring";
