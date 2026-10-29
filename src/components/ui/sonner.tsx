"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

export { toast };

/** Reads the `message` field of a JSON error response, falling back to `fallback`. */
export async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.clone().json()) as { message?: unknown; error?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  } catch {
    // Non-JSON body.
  }
  return fallback;
}

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      visibleToasts={4}
      icons={{
        success: <CheckCircle2 className="size-[18px] text-emerald-600 dark:text-emerald-400" />,
        error: <XCircle className="size-[18px] text-destructive" />,
        warning: <AlertTriangle className="size-[18px] text-amber-600 dark:text-amber-400" />,
        info: <Info className="size-[18px] text-primary" />,
        loading: <Loader2 className="size-[18px] animate-spin text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "font-sans gap-3! rounded-2xl! border-border/50! px-4! py-3.5! shadow-[0_18px_48px_oklch(0.28_0.025_55/0.16)]! backdrop-blur-md",
          title: "text-sm! font-medium! leading-snug!",
          description: "text-xs! leading-relaxed! text-muted-foreground!",
          error: "border-destructive/35!",
          success: "border-emerald-500/30!",
          closeButton: "border-border/50! bg-card! text-muted-foreground! hover:text-foreground!",
          actionButton: "rounded-full! bg-primary! text-primary-foreground! font-medium!",
        },
      }}
      style={
        {
          "--normal-bg": "color-mix(in oklch, var(--popover) 94%, transparent)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "1rem",
        } as CSSProperties
      }
      {...props}
    />
  );
}
