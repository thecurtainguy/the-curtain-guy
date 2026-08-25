"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import {
  motionDurations,
  premiumEase,
  reducedReveal,
  revealVariants,
  viewportOnce,
  type RevealVariant,
} from "@/lib/animation";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  /** Animate on mount instead of whileInView */
  immediate?: boolean;
  /** Re-animate when scrolling back into view (default: once) */
  once?: boolean;
} & Omit<HTMLMotionProps<"div">, "children" | "variants" | "initial" | "animate">;

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = motionDurations.reveal,
  className,
  immediate = false,
  once = true,
  ...rest
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion
    ? reducedReveal
    : revealVariants[variant];

  const transition = {
    duration: prefersReducedMotion ? 0.2 : duration,
    delay: prefersReducedMotion ? 0 : delay,
    ease: premiumEase,
  };

  const viewport = { ...viewportOnce, once };

  if (immediate) {
    return (
      <motion.div
        className={cn(className)}
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={transition}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      transition={transition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
