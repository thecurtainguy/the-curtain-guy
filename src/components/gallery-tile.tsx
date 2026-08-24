import Image from "next/image";
import { cn } from "@/lib/utils";

const gradientVariants = [
  "from-[#1a1512] via-[#2a221c] to-[#0f0d0b]",
  "from-[#14110f] via-[#252018] to-[#0a0908]",
  "from-[#1c1814] via-[#302820] to-[#12100e]",
  "from-[#181410] via-[#28221c] to-[#0e0c0a]",
  "from-[#1a1612] via-[#2c241e] to-[#100e0c]",
  "from-[#161310] via-[#262018] to-[#0c0a08]",
  "from-[#1e1a16] via-[#322a22] to-[#12100e]",
  "from-[#141210] via-[#242018] to-[#0a0908]",
];

type GalleryTileProps = {
  label: string;
  description?: string;
  image?: string;
  alt?: string;
  index?: number;
  className?: string;
  aspect?: "square" | "wide" | "tall";
};

function PlaceholderLayers({
  index,
  gradient,
}: {
  index: number;
  gradient: string;
}) {
  const foldCount = 5 + (index % 3);

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-[1.03]",
          gradient
        )}
      />
      <div className="absolute inset-0 flex opacity-70">
        {Array.from({ length: foldCount }).map((_, i) => (
          <div
            key={i}
            className="relative h-full flex-1"
            style={{
              background: `linear-gradient(90deg,
                transparent 0%,
                rgba(212,175,55,${0.03 + (i % 2) * 0.04}) 50%,
                transparent 100%)`,
            }}
          >
            <div className="absolute inset-y-0 right-0 w-px bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_10%,rgba(212,175,55,0.22),transparent_55%)] transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.5)_2px,rgba(255,255,255,0.5)_3px)]" />
    </>
  );
}

export function GalleryTile({
  label,
  description,
  image,
  alt,
  index = 0,
  className,
  aspect = "square",
}: GalleryTileProps) {
  const gradient = gradientVariants[index % gradientVariants.length];
  const imageAlt = alt ?? `${label} event drape rental`;
  const hasImage = Boolean(image);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-white/[0.06] bg-card/30",
        "shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]",
        "transition-all duration-500 hover:border-primary/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_24px_rgba(212,175,55,0.08)]",
        aspect === "square" && "aspect-square",
        aspect === "wide" && "aspect-[16/10]",
        aspect === "tall" && "aspect-[3/4]",
        className
      )}
    >
      {hasImage ? (
        <>
          <Image
            src={image!}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/35" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(212,175,55,0.18),transparent_60%)]" />
        </>
      ) : (
        <PlaceholderLayers index={index} gradient={gradient} />
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-16 transition-opacity duration-300",
          description && !hasImage && "group-hover:opacity-0"
        )}
      >
        <p className="text-sm font-medium text-foreground">{label}</p>
        {!hasImage && !description && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Photography coming soon
          </p>
        )}
      </div>

      {description && !hasImage && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-primary/70">
            Photography coming soon
          </p>
        </div>
      )}

      {hasImage && description && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      )}

      {!hasImage && (
        <div className="absolute right-3 top-3 size-8 rounded-full border border-primary/20 bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
    </div>
  );
}
