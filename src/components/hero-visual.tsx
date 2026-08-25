import { SiteMediaImage } from "@/components/media/site-media-image";
import { cn } from "@/lib/utils";

type HeroVisualProps = {
  className?: string;
};

export function HeroVisual({ className }: HeroVisualProps) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border/50 shadow-[0_20px_60px_oklch(0_0_0/18%)] sm:aspect-[3/4] lg:aspect-[4/5] lg:min-h-[min(28rem,62vh)] xl:min-h-[min(32rem,68vh)]",
        className
      )}
    >
      <SiteMediaImage
        mediaKey="home.hero.primary"
        priority
        sizes="(max-width: 1024px) 92vw, (max-width: 1280px) 54vw, 720px"
        className="absolute inset-0"
        imageClassName="object-cover object-[center_38%]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5 dark:from-black/50 dark:to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(212,175,55,0.15),transparent_55%)]" />
    </div>
  );
}
