"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Shared Curtain Guy luxury tooltip (portaled — not browser chrome title).
 * Used for collapsed sidebar rail icons and reusable elsewhere.
 */
export function PortalTooltip({
  label,
  children,
  enabled = true,
  side = "right",
  sideOffset = 10,
  delayDuration = 320,
}: {
  label: string;
  children: React.ReactElement;
  enabled?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  delayDuration?: number;
}) {
  if (!enabled || !label.trim()) {
    return children;
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset} tone="card">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
