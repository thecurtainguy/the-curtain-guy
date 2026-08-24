import Image from "next/image";
import { cn } from "@/lib/utils";
import { FabricVisual } from "@/components/fabric-visual";

type MediaVisualProps = {
  image?: string;
  alt: string;
  className?: string;
  variant?: "default" | "hero";
};

export function MediaVisual({
  image,
  alt,
  className,
  variant = "default",
}: MediaVisualProps) {
  if (!image) {
    return (
      <FabricVisual
        variant={variant === "hero" ? "hero" : "default"}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl",
        "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 480px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(212,175,55,0.2),transparent_55%)]" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
    </div>
  );
}
