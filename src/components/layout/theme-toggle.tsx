"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

function subscribe() {
  return () => {};
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("relative shrink-0 overflow-hidden", className)}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle color theme"
      }
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        <span className="relative flex size-4 items-center justify-center">
          <Sun
            className={cn(
              "absolute size-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              isDark
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-50 opacity-0"
            )}
            aria-hidden
          />
          <Moon
            className={cn(
              "absolute size-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              isDark
                ? "-rotate-90 scale-50 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            )}
            aria-hidden
          />
        </span>
      ) : (
        <Sun className="size-4 opacity-50" aria-hidden />
      )}
    </Button>
  );
}
