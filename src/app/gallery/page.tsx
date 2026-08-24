import type { Metadata } from "next";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { galleryPageCategories } from "@/data/site";
import { GalleryTile } from "@/components/gallery-tile";
import { GalleryCategoriesSection } from "@/components/sections/gallery-categories-section";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Event Drape Rental Gallery",
  description:
    "Explore luxury event drape rental transformations in Montreal — wedding draping, corporate event draping, gala drape rentals, mitzvah draping, stage backdrops, blackout drape, and venue transformations.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Montreal event draping across every category."
        description="Browse representative event draping inspiration across categories. Client photography from Montreal events will replace stock imagery in a future update."
      />

      <section className="relative py-16 sm:py-20">
        <div className="fabric-section-overlay pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-8 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Representative draping inspiration — stock imagery until client photos are added
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {galleryPageCategories.map((category, index) => (
              <GalleryTile
                key={category.label}
                label={category.label}
                description={category.description}
                image={category.image}
                alt={category.alt}
                index={index}
                aspect={
                  index % 3 === 0
                    ? "tall"
                    : index % 3 === 1
                      ? "wide"
                      : "square"
                }
              />
            ))}
          </div>
        </div>
      </section>

      <GalleryCategoriesSection />

      <QuoteCTA />
    </>
  );
}
