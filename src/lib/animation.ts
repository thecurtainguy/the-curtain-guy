/**
 * Shared luxury motion tokens for The Curtain Guy.
 * Prefer transform + opacity. Keep durations short and easings soft.
 */

export const premiumEase = [0.22, 1, 0.36, 1] as const;

export const motionDurations = {
  instant: 0.15,
  fast: 0.25,
  base: 0.45,
  reveal: 0.55,
  page: 0.42,
  hero: 0.7,
} as const;

export const staggerDelay = {
  tight: 0.06,
  base: 0.08,
  relaxed: 0.1,
} as const;

export const viewportOnce = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -40px 0px",
} as const;

export type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "blur-in"
  | "reveal-soft"
  /** Calm app-shell page change — opacity only, no motion/blur flash */
  | "portal-fade";

type VariantState = {
  opacity: number;
  x?: number;
  y?: number;
  scale?: number;
  filter?: string;
};

export const revealVariants: Record<
  RevealVariant,
  { hidden: VariantState; visible: VariantState }
> = {
  "fade-up": {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -14 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: -28 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: 28 },
    visible: { opacity: 1, x: 0 },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
  },
  "blur-in": {
    hidden: { opacity: 0, filter: "blur(6px)", y: 10 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  "reveal-soft": {
    hidden: { opacity: 0, y: 12, scale: 0.985 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  "portal-fade": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

/** Reduced-motion: opacity only — no translate/scale/blur. */
export const reducedReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;

export const pageTransitionVariants = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  reduced: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
} as const;

export type PageMotionPreset =
  | "public"
  | "home"
  | "gallery"
  | "estimate"
  | "ai"
  | "quote"
  | "account"
  | "admin";

export function getPageMotionPreset(pathname: string): PageMotionPreset {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/quote/")) return "quote";
  if (pathname.startsWith("/get-estimate")) return "estimate";
  if (pathname === "/ai" || pathname.startsWith("/ai/")) return "ai";
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) return "gallery";
  if (pathname === "/") return "home";
  return "public";
}

export const pagePresetConfig: Record<
  PageMotionPreset,
  { duration: number; y: number; blur: number }
> = {
  home: { duration: 0.48, y: 16, blur: 6 },
  public: { duration: 0.42, y: 14, blur: 5 },
  gallery: { duration: 0.4, y: 12, blur: 4 },
  estimate: { duration: 0.38, y: 12, blur: 4 },
  ai: { duration: 0.5, y: 18, blur: 8 },
  quote: { duration: 0.45, y: 14, blur: 5 },
  /** Soft opacity-only — portals feel app-like, not marketing-blinky */
  account: { duration: 0.9, y: 0, blur: 0 },
  admin: { duration: 0.9, y: 0, blur: 0 },
};

export const hoverLift = {
  y: -2,
  transition: { duration: motionDurations.fast, ease: premiumEase },
} as const;

export const tapPress = {
  scale: 0.98,
  transition: { duration: motionDurations.instant },
} as const;
