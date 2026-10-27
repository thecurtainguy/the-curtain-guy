import Image from "next/image";
import { brandMonogram } from "@/data/site";
import { cn } from "@/lib/utils";

/** Line item photo, or the brand monogram on a cream tile when there is no inventory image. */
export function LineItemThumb({
  src,
  alt,
  sizes,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border",
        src
          ? "border-border/40 bg-muted/30"
          : "border-[#e2d4b0]/50 bg-[#f5efe0] dark:border-primary/20 dark:bg-primary/10",
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} unoptimized />
      ) : (
        <Image
          src={brandMonogram.src}
          alt=""
          aria-hidden
          fill
          className="object-contain p-[12%] opacity-90"
          sizes={sizes}
        />
      )}
    </div>
  );
}
