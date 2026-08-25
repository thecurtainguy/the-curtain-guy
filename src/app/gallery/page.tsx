import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { galleryCategories } from "@/data/gallery";
import { galleryCategoryMediaKeys } from "@/data/site-media";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { createPageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

export const metadata: Metadata = createPageMetadata({
  title: "Event Drape Rental Gallery",
  description:
    "Event drape rental gallery for Montreal — wedding draping, pipe and drape, stage backdrops, corporate/gala, blackout masking, and Bar/Bat Mitzvah visual examples.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Event Drape Rental Gallery"
        description="Licensed visual examples of the drape styles we plan and quote. Owner project photography will replace these inspiration images as events are documented."
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">Request an Estimate</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/services">View Services</Link>
          </Button>
        </div>
      </PageHero>

      <section className="relative py-14 sm:py-20">
        <div className="fabric-section-overlay pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap gap-2">
            {galleryCategories.map((category) => {
              const Icon = category.icon;
              return (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Icon className="size-3.5 text-primary/80" />
                  {category.label}
                </a>
              );
            })}
          </div>

          <div className="space-y-14">
            {galleryCategories.map((category) => {
              const keys = galleryCategoryMediaKeys[category.id] ?? [];
              const Icon = category.icon;

              return (
                <div key={category.id} id={category.id} className="scroll-mt-24">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Icon className="size-4" />
                      </div>
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        {category.label}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                    {category.serviceHref && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="min-h-10 w-fit"
                      >
                        <Link href={category.serviceHref}>Related service</Link>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                    {keys.map((mediaKey, index) => (
                      <div
                        key={mediaKey}
                        className="media-frame group relative aspect-[4/3] overflow-hidden rounded-2xl bg-card/30"
                      >
                        <SiteMediaImage
                          mediaKey={mediaKey}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="absolute inset-0"
                          imageClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                          showCaption={index === 0}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-3 left-3">
                          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/90">
                            Inspiration
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="mt-14 border-border/40 bg-card/40">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Upload className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    Have inspiration photos or a floor plan?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Upload them with your estimate request so we can plan the
                    right draping approach for your venue.
                  </p>
                </div>
              </div>
              <Button asChild className="min-h-11 shrink-0 w-full sm:w-auto">
                <Link href="/get-estimate">Start your brief</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline="Plan your drape rental."
        description="Request an estimate for luxury event draping in Montreal and surrounding areas."
      />
    </>
  );
}
