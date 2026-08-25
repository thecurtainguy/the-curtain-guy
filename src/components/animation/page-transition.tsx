"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  getPageMotionPreset,
  pagePresetConfig,
  premiumEase,
} from "@/lib/animation";
import { cn } from "@/lib/utils";

type PageTransitionProps = {
  children: React.ReactNode;
};

function isAuthSurface(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/admin/login" ||
    pathname === "/account/login" ||
    pathname === "/account/signup" ||
    pathname.startsWith("/account/login/") ||
    pathname.startsWith("/account/signup/")
  );
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const preset = getPageMotionPreset(pathname ?? "/");
  const config = pagePresetConfig[preset];
  const [settledPath, setSettledPath] = useState<string | null>(null);
  const settled = settledPath === pathname;
  const isPortal =
    (preset === "account" || preset === "admin") && !isAuthSurface(pathname);

  if (prefersReducedMotion) {
    return (
      <motion.div
        key={pathname}
        className={cn(isPortal && "h-svh max-h-svh overflow-hidden")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      key={pathname}
      className={cn(
        settled && "page-transition-settled",
        isPortal && "h-svh max-h-svh overflow-hidden"
      )}
      initial={{
        opacity: 0,
        y: config.y,
        ...(config.blur > 0 ? { filter: `blur(${config.blur}px)` } : {}),
      }}
      animate={{
        opacity: 1,
        y: 0,
        ...(config.blur > 0 ? { filter: "none" } : {}),
      }}
      transition={{
        duration: config.duration,
        ease: isPortal ? [0.4, 0, 0.2, 1] : premiumEase,
      }}
      onAnimationComplete={() => setSettledPath(pathname)}
    >
      {children}
    </motion.div>
  );
}
