"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  galleryCategories,
  type GalleryCategoryId,
} from "@/data/gallery";
import type { SiteMediaKey } from "@/data/site-media";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

const teaserKeys: Record<string, SiteMediaKey> = {
  wedding: "home.gallery.wedding",
  "pipe-and-drape": "home.gallery.pipe_drape",
  stage: "home.gallery.stage",
  corporate: "home.gallery.corporate",
  blackout: "home.gallery.blackout",
  mitzvah: "home.gallery.mitzvah",
};

const galleryTeaserCategoryKeys: Record<GalleryCategoryId, string> = {
  wedding: "weddings",
  "pipe-and-drape": "corporate",
  stage: "galas",
  corporate: "mitzvahs",
  blackout: "stage",
  mitzvah: "room-transformations",
};

export function GalleryTeaserSection() {
  const t = useTranslations("home.galleryTeaser");
  const tg = useTranslations("gallery");

  return (
    <SectionShell variant="fabric" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal variant="fade-up">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
            />
            <Button asChild variant="outline" className="min-h-11 shrink-0">
              <Link href="/gallery">
                {t("explore")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Stagger className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4" stagger={0.07}>
          {galleryCategories.map((category) => {
            const mediaKey = teaserKeys[category.id];
            const categoryKey = galleryTeaserCategoryKeys[category.id];
            return (
              <AnimatedCard
                key={category.id}
                variant="scale-in"
                hover={false}
                className="aspect-square min-h-0"
              >
                <Link
                  href={`/gallery#${category.id}`}
                  className="media-frame group relative block size-full overflow-hidden rounded-2xl bg-card/30"
                >
                  {mediaKey && (
                    <SiteMediaImage
                      mediaKey={mediaKey}
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="absolute inset-0"
                      imageClassName="transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">
                      {tg("page.inspiration")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {tg(`categories.${categoryKey}.label`)}
                    </p>
                  </div>
                </Link>
              </AnimatedCard>
            );
          })}
        </Stagger>
      </div>
    </SectionShell>
  );
}
