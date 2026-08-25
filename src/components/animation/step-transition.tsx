"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { premiumEase, motionDurations } from "@/lib/animation";
import { cn } from "@/lib/utils";

type StepTransitionProps = {
  stepKey: string;
  children: React.ReactNode;
  className?: string;
  /** Direction of enter: 1 = from right, -1 = from left */
  direction?: 1 | -1;
};

/**
 * Horizontal slide/fade between estimate (or wizard) steps.
 * Keep form state outside — only wraps the visible step panel.
 */
export function StepTransition({
  stepKey,
  children,
  className,
  direction = 1,
}: StepTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, x: direction * 28 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -20 },
      };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: prefersReducedMotion
              ? motionDurations.fast
              : motionDurations.base,
            ease: premiumEase,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
