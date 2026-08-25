import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { galleryCategories } from "@/data/gallery";
import type { SiteMediaKey } from "@/data/site-media";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Button } from "@/components/ui/button";

const teaserKeys: Record<string, SiteMediaKey> = {
  wedding: "home.gallery.wedding",
  "pipe-and-drape": "home.gallery.pipe_drape",
  stage: "home.gallery.stage",
  corporate: "home.gallery.corporate",
  blackout: "home.gallery.blackout",
  mitzvah: "home.gallery.mitzvah",
};

export function GalleryTeaserSection() {
  return (
    <SectionShell variant="fabric" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Gallery"
            title="Event draping inspiration by category."
            description="Browse visual examples of the drape installations we plan and quote. Images are licensed inspiration until owner project photography is added."
          />
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href="/gallery">
              Explore Gallery
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {galleryCategories.map((category) => {
            const mediaKey = teaserKeys[category.id];
            return (
              <Link
                key={category.id}
                href={`/gallery#${category.id}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-card/30 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
              >
                {mediaKey && (
                  <SiteMediaImage
                    mediaKey={mediaKey}
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="absolute inset-0"
                    imageClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">
                    Inspiration
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {category.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
