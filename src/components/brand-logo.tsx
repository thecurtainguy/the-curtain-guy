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
  /** Top-left site header — horizontal lockup, retina-ready */
  header: {
    box: "h-12 w-[11rem] sm:h-14 sm:w-[13.75rem] lg:h-16 lg:w-[15.75rem]",
    compactBox:
      "h-9 w-[9.25rem] sm:h-10 sm:w-[11rem] lg:h-11 lg:w-[12.75rem]",
    sizes: "(max-width: 640px) 176px, (max-width: 1024px) 220px, 252px",
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
  priority = false,
  compact = false,
  showWordmark = false,
  wordmarkSuffix,
  onClick,
}: BrandLogoProps) {
  const dims = sizeMap[size];
  const logo = dims.asset === "horizontal" ? brandLogoHorizontal : brandLogo;
  const boxClass =
    size === "header" && compact && "compactBox" in dims
      ? dims.compactBox
      : dims.box;

  const mark = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden bg-transparent",
        "transition-[width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
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
        className="bg-transparent object-contain object-left"
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
