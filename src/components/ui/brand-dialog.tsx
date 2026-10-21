"use client";

import { useCallback, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-5xl",
} as const;

/**
 * Branded popup shell used across the site: gold-glow gradient header with
 * icon badge, eyebrow and heading-font title; scrolling body; footer bar.
 */
export function BrandDialogContent({
  eyebrow,
  title,
  description,
  icon: Icon,
  footer,
  children,
  size = "lg",
  scrollBody = true,
  showCloseButton = true,
  className,
  bodyClassName,
  footerClassName,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  /** Turn off when the body manages its own scrolling list. */
  scrollBody?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        "flex max-h-[min(92vh,940px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border border-border/50 bg-card p-0 text-foreground",
        SIZE_CLASSES[size],
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-6 py-5 sm:px-7",
          (children || footer) && "border-b border-border/40"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
          aria-hidden
        />
        <DialogHeader
          className={cn("relative gap-2 text-left", showCloseButton && "pr-10")}
        >
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Icon className="size-5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 space-y-1.5">
              {eyebrow ? (
                <p className="text-[10px] font-medium tracking-[0.2em] text-primary uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <DialogTitle className="font-heading text-2xl leading-tight font-semibold text-foreground">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="max-w-xl text-sm leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
      </div>

      {children ? (
        <div
          className={cn(
            "min-h-0 flex-1 px-6 py-5 sm:px-7",
            scrollBody
              ? "overflow-y-auto overscroll-y-contain"
              : "flex flex-col overflow-hidden",
            bodyClassName
          )}
        >
          {children}
        </div>
      ) : null}

      {footer ? (
        <DialogFooter
          className={cn(
            "shrink-0 items-center border-t border-border/40 bg-card/80 px-6 py-4 sm:px-7",
            footerClassName
          )}
        >
          {footer}
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}

/** Gold eyebrow label + content block inside a branded popup body. */
export function BrandDialogSection({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
        {label}
      </p>
      {children}
    </section>
  );
}

export type BrandConfirmOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
};

/** Branded yes/no confirmation popup. */
export function BrandConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  eyebrow = "Please confirm",
  icon = AlertTriangle,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: BrandConfirmOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="sm"
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </Dialog>
  );
}

/**
 * Promise-based replacement for `window.confirm` that renders the branded
 * popup. Render the returned element once in the component.
 */
export function useBrandConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<BrandConfirmOptions>({ title: "" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback((next: BrandConfirmOptions) => {
    resolveRef.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const dialog = (
    <BrandConfirmDialog
      {...options}
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
      onConfirm={() => settle(true)}
    />
  );

  return [confirm, dialog] as const;
}
