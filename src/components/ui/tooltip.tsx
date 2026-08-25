"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  tone = "inverse",
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  /** `card` = cream/elevated Curtain Guy tip; `inverse` = default high-contrast. */
  tone?: "inverse" | "card";
}) {
  const isCard = tone === "card";

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-xl opacity-100 has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          isCard
            ? "rounded-2xl border border-primary/40 bg-[oklch(0.99_0.008_88)] px-4 py-2.5 font-heading text-sm font-semibold tracking-wide text-foreground shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] ring-1 ring-primary/20 dark:bg-[oklch(0.18_0.012_55)]"
            : "bg-foreground px-3 py-1.5 text-xs text-background",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          data-slot="tooltip-arrow"
          className={cn(
            "z-50 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] data-[side=left]:translate-x-[-1.5px] data-[side=right]:translate-x-[1.5px]",
            isCard
              ? "size-3 border border-primary/35 bg-[oklch(0.99_0.008_88)] fill-[oklch(0.99_0.008_88)] dark:bg-[oklch(0.18_0.012_55)] dark:fill-[oklch(0.18_0.012_55)]"
              : "size-2.5 bg-foreground fill-foreground"
          )}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
