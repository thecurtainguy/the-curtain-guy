"use client";

import { PageTransition } from "@/components/animation/page-transition";

/**
 * App Router template remounts on navigation, enabling entrance animation
 * without converting layouts to client components.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
