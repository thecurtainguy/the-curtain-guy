"use client";

import { createContext, useContext } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  motionDurations,
  premiumEase,
  reducedReveal,
  staggerDelay,
  viewportOnce,
} from "@/lib/animation";
import { cn } from "@/lib/utils";

const StaggerContext = createContext(false);

export function useStaggerParent() {
  return useContext(StaggerContext);
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  /** Delay between children */
  stagger?: number;
  /** Delay before first child */
  delayChildren?: number;
  immediate?: boolean;
  once?: boolean;
};

export function Stagger({
  children,
  className,
  stagger = staggerDelay.base,
  delayChildren = 0.05,
  immediate = false,
  once = true,
}: StaggerProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stagger,
        delayChildren: prefersReducedMotion ? 0 : delayChildren,
      },
    },
  };

  const shared = {
    className: cn(className),
    variants: containerVariants,
    initial: "hidden" as const,
  };

  return (
    <StaggerContext.Provider value={true}>
      {immediate ? (
        <motion.div {...shared} animate="visible">
          {children}
        </motion.div>
      ) : (
        <motion.div
          {...shared}
          whileInView="visible"
          viewport={{ ...viewportOnce, once }}
        >
          {children}
        </motion.div>
      )}
    </StaggerContext.Provider>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
};

/** Child of Stagger — fades/slides up with parent stagger timing. */
export function StaggerItem({ children, className }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const inStagger = useStaggerParent();

  const variants = prefersReducedMotion
    ? reducedReveal
    : {
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: motionDurations.reveal,
            ease: premiumEase,
          },
        },
      };

  if (!inStagger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={variants}>
      {children}
    </motion.div>
  );
}
