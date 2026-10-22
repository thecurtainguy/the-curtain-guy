"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type * as React from "react";

/** Keyboard hint chip inside a studio tooltip. */
export function TipKbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      data-slot="kbd"
      className="ml-1 inline-flex h-5 items-center rounded-md border border-background/25 bg-background/15 px-1.5 font-mono text-[0.6rem] leading-none"
    >
      {children}
    </kbd>
  );
}

/**
 * Branded tooltip for any studio control — use instead of the native
 * `title` attribute. The child must forward refs and props (a DOM element or
 * a Radix trigger); wrap disabled buttons in a `<span>` so hover still fires.
 */
export function StudioTip({
  label,
  shortcut,
  side = "top",
  align,
  disabled,
  className,
  children,
}: {
  label: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Render the child without a tooltip. */
  disabled?: boolean;
  className?: string;
  children: React.ReactElement;
}) {
  if (disabled || label === null || label === undefined || label === "") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={6} className={cn("max-w-64", className)}>
        {label}
        {shortcut ? <TipKbd>{shortcut}</TipKbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
