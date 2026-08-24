import Image from "next/image";
import { cn } from "@/lib/utils";
import { FabricVisual } from "@/components/fabric-visual";
import { heroImage } from "@/data/site";

type HeroVisualProps = {
  className?: string;
};

export function HeroVisual({ className }: HeroVisualProps) {
  if (!heroImage.image) {
    return <FabricVisual variant="hero" className={className} />;
  }

  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full min-h-[320px] overflow-hidden rounded-3xl sm:min-h-[380px] lg:min-h-[440px] lg:max-w-lg",
        "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]",
        className
      )}
    >
      <Image
        src={heroImage.image}
        alt={heroImage.alt ?? "Luxury event drape rentals in Montreal"}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 560px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_35%_18%,rgba(212,175,106,0.28),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(212,175,106,0.12),transparent_45%)]" />

      <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-white/15 bg-black/55 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:bottom-6 sm:left-5 sm:right-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
          Venue Transformation
        </p>
        <p className="mt-1.5 text-sm font-medium text-foreground">
          Luxury event draping atmosphere
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Ballroom • Stage • Perimeter drape
        </p>
      </div>

      <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
    </div>
  );
}
