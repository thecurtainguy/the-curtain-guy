"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function StarRatingInput({
  value,
  onChange,
  disabled,
  className,
}: StarRatingInputProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const selected = starValue <= value;

        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            onClick={() => onChange(starValue)}
            className={cn(
              "rounded-xl p-1 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            <Star
              className={cn(
                "size-7",
                selected
                  ? "fill-primary text-primary"
                  : "fill-transparent text-border"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
