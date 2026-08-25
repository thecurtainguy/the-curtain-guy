import Image from "next/image";
import Link from "next/link";
import { brandLogo, siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl" | "header" | "footer";
  className?: string;
  priority?: boolean;
  /** Show text label beside a compact mark (account/admin) */
  showWordmark?: boolean;
  wordmarkSuffix?: string;
  onClick?: () => void;
};

const sizeMap = {
  sm: { box: "h-11 w-11", sizes: "44px" },
  md: { box: "h-16 w-16", sizes: "64px" },
  header: { box: "h-[4.25rem] w-[4.25rem] sm:h-20 sm:w-20", sizes: "80px" },
  lg: { box: "h-28 w-28 sm:h-32 sm:w-32", sizes: "128px" },
  footer: { box: "h-32 w-32 sm:h-40 sm:w-40", sizes: "160px" },
  xl: { box: "h-40 w-40 sm:h-48 sm:w-48", sizes: "192px" },
} as const;

export function BrandLogo({
  href = "/",
  size = "md",
  className,
  priority = false,
  showWordmark = false,
  wordmarkSuffix,
  onClick,
}: BrandLogoProps) {
  const dims = sizeMap[size];

  const mark = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden",
        dims.box,
        className
      )}
    >
      <Image
        src={brandLogo.src}
        alt={brandLogo.alt}
        fill
        sizes={dims.sizes}
        priority={priority}
        quality={95}
        className="object-contain object-center"
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
    <Link
      href={href}
      onClick={onClick}
      className="group inline-flex shrink-0 items-center outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${siteConfig.name} home`}
    >
      {content}
      {!showWordmark && <span className="sr-only">{siteConfig.name}</span>}
    </Link>
  );
}
