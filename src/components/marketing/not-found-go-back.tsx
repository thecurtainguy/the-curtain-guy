"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type NotFoundGoBackProps = {
  className?: string;
};

/**
 * Soft secondary action — returns to the previous in-app page when possible.
 */
export function NotFoundGoBack({ className }: NotFoundGoBackProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") return;

    const canGoBack =
      window.history.length > 1 &&
      document.referrer !== "" &&
      (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();

    if (canGoBack) {
      window.history.back();
      return;
    }

    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-[color,transform] duration-200",
        "hover:text-foreground enabled:active:scale-[0.98]",
        "focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-reduce:transition-none motion-reduce:enabled:active:scale-100",
        className
      )}
    >
      <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
      Go back
    </button>
  );
}
