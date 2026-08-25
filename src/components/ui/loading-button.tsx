"use client";

import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type LoadingButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
    asChild?: never;
  };

/**
 * Button with built-in pending state for async actions.
 * Disables interaction while loading to prevent double-submit.
 */
export function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  icon,
  disabled,
  className,
  variant,
  size,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        isLoading && "pointer-events-none opacity-80",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}
