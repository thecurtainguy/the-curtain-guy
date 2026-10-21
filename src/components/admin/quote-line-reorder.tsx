"use client";

import { GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { cn } from "@/lib/utils";

export const QuoteLineReorderGroup = Reorder.Group;

/**
 * Quote line row that can be dragged by its grip handle only, so inputs
 * inside the row keep normal pointer and text selection behaviour.
 */
export function QuoteLineReorderItem<T>({
  value,
  enabled,
  label,
  onMove,
  className,
  children,
}: {
  value: T;
  enabled: boolean;
  label: string;
  onMove: (direction: -1 | 1) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={value}
      drag={enabled ? "y" : false}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.01,
        boxShadow: "0 18px 40px -12px rgba(26, 22, 18, 0.35)",
        zIndex: 20,
      }}
      className={cn("relative flex gap-2", className)}
    >
      {enabled ? (
        <button
          type="button"
          aria-label={`Drag to reorder ${label}. Use arrow keys to move.`}
          title="Drag to reorder"
          onPointerDown={(event) => {
            event.preventDefault();
            controls.start(event);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onMove(-1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              onMove(1);
            }
          }}
          className="-my-1 -ml-1 flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="@container min-w-0 flex-1">{children}</div>
    </Reorder.Item>
  );
}
