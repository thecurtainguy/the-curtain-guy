"use client";

import type { EventBuilderRoomShape } from "@/data/event-builder/brief";
import { SelectionCheck } from "@/components/event-builder/selection-check";
import { cn } from "@/lib/utils";

type RoomShapeCardProps = {
  shape: EventBuilderRoomShape;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

function RoomShapeDiagram({ shape }: { shape: EventBuilderRoomShape }) {
  if (shape === "l_shape") {
    return (
      <svg
        viewBox="0 0 88 60"
        className="h-16 w-[5.5rem] text-primary"
        aria-hidden
      >
        <path
          d="M6 6 H82 V32 H50 V54 H6 Z"
          className="fill-primary/18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 88 60"
      className="h-16 w-[5.5rem] text-primary"
      aria-hidden
    >
      <rect
        x="6"
        y="6"
        width="76"
        height="48"
        rx="4"
        className="fill-primary/18"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function RoomShapeCard({
  shape,
  label,
  selected,
  onSelect,
}: RoomShapeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/55 hover:-translate-y-px active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <SelectionCheck
        selected={selected}
        className="absolute right-3 top-3 shadow-sm backdrop-blur-sm"
      />
      <div
        className="flex w-full items-center justify-center rounded-xl border border-border/30 bg-background/50 py-4"
      >
        <RoomShapeDiagram shape={shape} />
      </div>
      <span className="font-heading text-sm font-semibold text-foreground">
        {label}
      </span>
    </button>
  );
}
