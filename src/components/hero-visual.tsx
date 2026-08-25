import { SiteMediaImage } from "@/components/media/site-media-image";
import { cn } from "@/lib/utils";

type HeroVisualProps = {
  className?: string;
};

export function HeroVisual({ className }: HeroVisualProps) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:aspect-[3/4] lg:max-w-lg",
        className
      )}
    >
      <SiteMediaImage
        mediaKey="home.hero.primary"
        priority
        sizes="(max-width: 1024px) 90vw, 480px"
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(212,175,55,0.15),transparent_55%)]" />
    </div>
  );
}
