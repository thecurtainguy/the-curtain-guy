"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  hoverLift,
  motionDurations,
  premiumEase,
  reducedReveal,
  revealVariants,
  tapPress,
  viewportOnce,
  type RevealVariant,
} from "@/lib/animation";
import { useStaggerParent } from "@/components/animation/stagger";
import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  /** Enable subtle hover lift (default true) */
  hover?: boolean;
  immediate?: boolean;
};

export function AnimatedCard({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  hover = true,
  immediate = false,
}: AnimatedCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const inStagger = useStaggerParent();

  const reveal = prefersReducedMotion
    ? reducedReveal
    : revealVariants[variant];

  const hoverProps =
    hover && !prefersReducedMotion
      ? {
          whileHover: hoverLift,
          whileTap: tapPress,
        }
      : {};

  const transition = {
    duration: prefersReducedMotion ? 0.2 : motionDurations.reveal,
    delay: prefersReducedMotion || inStagger ? 0 : delay,
    ease: premiumEase,
  };

  const variants = inStagger
    ? {
        hidden: reveal.hidden,
        visible: {
          ...reveal.visible,
          transition,
        },
      }
    : reveal;

  if (inStagger) {
    return (
      <motion.div
        className={cn(className?.includes("aspect-") ? "min-h-0" : "h-full", className)}
        variants={variants}
        {...hoverProps}
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    );
  }

  if (immediate) {
    return (
      <motion.div
        className={cn(className?.includes("aspect-") ? "min-h-0" : "h-full", className)}
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={transition}
        {...hoverProps}
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className?.includes("aspect-") ? "min-h-0" : "h-full", className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
      transition={transition}
      {...hoverProps}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
