"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  getPageMotionPreset,
  pagePresetConfig,
  premiumEase,
} from "@/lib/animation";

type PageTransitionProps = {
  children: React.ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const preset = getPageMotionPreset(pathname ?? "/");
  const config = pagePresetConfig[preset];

  if (prefersReducedMotion) {
    return (
      <motion.div
        key={pathname}
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
      initial={{
        opacity: 0,
        y: config.y,
        ...(config.blur > 0 ? { filter: `blur(${config.blur}px)` } : {}),
      }}
      animate={{
        opacity: 1,
        y: 0,
        ...(config.blur > 0 ? { filter: "blur(0px)" } : {}),
      }}
      transition={{
        duration: config.duration,
        ease: premiumEase,
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
