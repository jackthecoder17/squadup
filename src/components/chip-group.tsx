"use client";

import { cn } from "@/lib/cn";

type ChipGroupProps = {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  max?: number;
  disabled?: boolean;
  "aria-label"?: string;
};

/** Multi-select pill group. Enforces `max` by disabling unselected chips once full. */
export function ChipGroup({
  options,
  selected,
  onToggle,
  max,
  disabled,
  "aria-label": ariaLabel,
}: ChipGroupProps) {
  const atCapacity = max !== undefined && selected.length >= max;

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        const isDisabled = disabled || (atCapacity && !isSelected);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={isDisabled}
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              isSelected
                ? "bg-foreground text-background border-transparent"
                : "border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500",
              isDisabled && "cursor-not-allowed opacity-40 hover:border-zinc-300",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
