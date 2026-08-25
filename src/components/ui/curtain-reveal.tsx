import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CurtainRevealProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function CurtainReveal({
  children,
  className,
  contentClassName,
}: CurtainRevealProps) {
  return (
    <div
      className={cn(
        "contact-curtain-stage relative overflow-hidden rounded-2xl border border-border/40 bg-card/30",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,oklch(0.76_0.15_88/0.14),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 48px, oklch(0.62 0.14 80 / 6%) 48px, oklch(0.62 0.14 80 / 6%) 49px)",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "contact-curtain-reveal relative z-0 flex min-h-[min(22rem,52vh)] flex-col items-center justify-center px-6 py-10 text-center sm:px-10",
          contentClassName
        )}
      >
        {children}
      </div>

      <div
        className="contact-curtain-panel contact-curtain-panel-left pointer-events-none absolute inset-y-0 left-0 z-20 w-[52%]"
        aria-hidden
      />
      <div
        className="contact-curtain-panel contact-curtain-panel-right pointer-events-none absolute inset-y-0 right-0 z-20 w-[52%]"
        aria-hidden
      />
    </div>
  );
}
