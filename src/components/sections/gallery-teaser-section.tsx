import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { galleryCategories } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { GalleryTile } from "@/components/gallery-tile";
import { Button } from "@/components/ui/button";

export function GalleryTeaserSection() {
  return (
    <SectionShell variant="fabric" divider="top" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Gallery"
            title="Event drape rental transformations by category."
            description="Wedding draping, corporate event draping, gala drape rentals, mitzvah draping, stage backdrops, and room transformations. Representative stock imagery until client photography is added."
          />
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/gallery">
              View Gallery
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {galleryCategories.map((category, index) => (
            <GalleryTile
              key={category.label}
              label={category.label}
              description={category.description}
              image={category.image}
              alt={category.alt}
              index={index}
              aspect="square"
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
