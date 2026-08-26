"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  getPageMotionPreset,
  pagePresetConfig,
  premiumEase,
} from "@/lib/animation";
import { cn } from "@/lib/utils";
import { isAccountAuthPath } from "@/lib/i18n/path-locale";

type PageTransitionProps = {
  children: React.ReactNode;
};

function isAuthSurface(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/admin/login" ||
    isAccountAuthPath(pathname)
  );
}

/** Blur entrance animations often stick on Android Chrome after full reload. */
function useSimplePageMotion() {
  const [simple, setSimple] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const update = () => setSimple(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return simple;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const simpleMotion = useSimplePageMotion();
  const preset = getPageMotionPreset(pathname ?? "/");
  const config = pagePresetConfig[preset];
  const [settledPath, setSettledPath] = useState<string | null>(null);
  const settled = settledPath === pathname;
  const isPortal =
    (preset === "account" || preset === "admin") && !isAuthSurface(pathname);
  const reduced = Boolean(prefersReducedMotion);
  const isHome = pathname === "/";
  const useBlur = !reduced && !simpleMotion && config.blur > 0 && !isHome;
  const yOffset =
    reduced || simpleMotion || isHome ? 0 : config.y;
  const duration = reduced || simpleMotion || isHome ? 0.2 : config.duration;

  useEffect(() => {
    if (reduced || simpleMotion || isHome) {
      setSettledPath(pathname);
      return;
    }

    const timeout = window.setTimeout(
      () => setSettledPath((current) => current ?? pathname),
      Math.ceil(duration * 1000) + 120
    );

    return () => window.clearTimeout(timeout);
  }, [pathname, reduced, simpleMotion, isHome, duration]);

  return (
    <motion.div
      key={pathname}
      data-page-transition=""
      className={cn(
        (settled || reduced || simpleMotion || isHome) &&
          "page-transition-settled",
        isPortal && "h-svh max-h-svh overflow-hidden"
      )}
      initial={{
        opacity: 0,
        y: yOffset,
        ...(useBlur ? { filter: `blur(${config.blur}px)` } : {}),
      }}
      animate={{
        opacity: 1,
        y: 0,
        ...(useBlur ? { filter: "blur(0px)" } : {}),
      }}
      transition={{
        duration,
        ease: isPortal && !simpleMotion ? [0.4, 0, 0.2, 1] : premiumEase,
      }}
      onAnimationComplete={() => setSettledPath(pathname)}
    >
      {children}
    </motion.div>
  );
}
