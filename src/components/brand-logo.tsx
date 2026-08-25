"use client";

import Image from "next/image";
import { brandLogo, brandLogoHorizontal, siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";
import { GuardedLink } from "@/components/ui/guarded-link";

type BrandLogoProps = {
  href?: string;
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl" | "header" | "footer";
  className?: string;
  /** Classes for the Next/Image (e.g. object-center). */
  imageClassName?: string;
  priority?: boolean;
  /** Compact header lockup while the page is scrolled */
  compact?: boolean;
  /** Show text label beside a compact mark (account/admin) */
  showWordmark?: boolean;
  wordmarkSuffix?: string;
  onClick?: () => void;
};

const sizeMap = {
  sm: {
    box: "h-11 w-11",
    sizes: "44px",
    asset: "mark" as const,
    quality: 90,
  },
  md: {
    box: "h-16 w-16",
    sizes: "64px",
    asset: "mark" as const,
    quality: 90,
  },
  /** Top-left site header — horizontal lockup, retina-ready.
   * Layout box stays constant; compact mode scales visually so sticky
   * height never changes (avoids scroll bounce / flicker). */
  header: {
    box: "h-11 w-[10.5rem] sm:h-12 sm:w-[12.5rem] lg:h-[3.25rem] lg:w-[14.5rem]",
    sizes: "(max-width: 640px) 168px, (max-width: 1024px) 200px, 232px",
    asset: "horizontal" as const,
    quality: 100,
  },
  lg: {
    box: "h-28 w-28 sm:h-32 sm:w-32",
    sizes: "128px",
    asset: "mark" as const,
    quality: 90,
  },
  footer: {
    box: "h-32 w-32 sm:h-40 sm:w-40",
    sizes: "160px",
    asset: "mark" as const,
    quality: 90,
  },
  xl: {
    box: "h-40 w-40 sm:h-48 sm:w-48",
    sizes: "192px",
    asset: "mark" as const,
    quality: 90,
  },
} as const;

export function BrandLogo({
  href = "/",
  size = "md",
  className,
  imageClassName,
  priority = false,
  compact = false,
  showWordmark = false,
  wordmarkSuffix,
  onClick,
}: BrandLogoProps) {
  const dims = sizeMap[size];
  const logo = dims.asset === "horizontal" ? brandLogoHorizontal : brandLogo;
  const boxClass = dims.box;

  const mark = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden bg-transparent",
        "origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        size === "header" && compact && "scale-[0.88]",
        boxClass,
        className
      )}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        fill
        sizes={dims.sizes}
        priority={priority}
        quality={dims.quality}
        // Horizontal lockup must keep RGBA — Next optimizer can flatten to
        // palette PNG and paint the transparent areas black on light theme.
        unoptimized={dims.asset === "horizontal"}
        className={cn(
          "bg-transparent object-contain object-left",
          imageClassName
        )}
      />
    </span>
  );

  const content = showWordmark ? (
    <span className="inline-flex items-center gap-3">
      {mark}
      <span className="min-w-0">
        <span className="block font-heading text-base font-semibold leading-tight text-foreground sm:text-lg">
          {siteConfig.name}
          {wordmarkSuffix ? ` ${wordmarkSuffix}` : ""}
        </span>
        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {siteConfig.tagline}
        </span>
      </span>
    </span>
  ) : (
    mark
  );

  if (!href) {
    return content;
  }

  return (
    <GuardedLink
      href={href}
      onClick={onClick}
      className="group inline-flex shrink-0 items-center outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${siteConfig.name} home`}
    >
      {content}
      {!showWordmark && <span className="sr-only">{siteConfig.name}</span>}
    </GuardedLink>
  );
}
