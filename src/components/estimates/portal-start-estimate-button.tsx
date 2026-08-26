"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortalStartEstimate } from "@/components/estimates/portal-estimate-embed";
import { cn } from "@/lib/utils";

export function PortalStartEstimateButton({
  children = "Start a new estimate",
  variant = "default",
  size,
  className,
  showIcon = true,
}: {
  children?: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  showIcon?: boolean;
}) {
  const startEstimate = usePortalStartEstimate();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={startEstimate}
    >
      {showIcon ? <PenLine className="size-4" /> : null}
      {children}
    </Button>
  );
}

export function PortalStartEstimateTextLink({
  children = "Start a new estimate",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const startEstimate = usePortalStartEstimate();

  return (
    <button
      type="button"
      onClick={startEstimate}
      className={cn("text-primary hover:underline", className)}
    >
      {children}
    </button>
  );
}
