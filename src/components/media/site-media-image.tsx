import Image from "next/image";
import type { SiteMediaKey } from "@/data/site-media";
import { getSiteMedia } from "@/lib/site-media";
import { cn } from "@/lib/utils";

type SiteMediaImageProps = {
  mediaKey: SiteMediaKey;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  showCaption?: boolean;
};

export function SiteMediaImage({
  mediaKey,
  fill = true,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className,
  imageClassName,
  showCaption = false,
}: SiteMediaImageProps) {
  const media = getSiteMedia(mediaKey);

  return (
    <figure className={cn("relative overflow-hidden", className)}>
      {fill ? (
        <Image
          src={media.path}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover object-center", imageClassName)}
        />
      ) : (
        <Image
          src={media.path}
          alt={media.alt}
          width={width ?? 1200}
          height={height ?? 800}
          sizes={sizes}
          priority={priority}
          className={cn("h-auto w-full object-cover object-center", imageClassName)}
        />
      )}
      {showCaption && media.caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-primary/90">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}
