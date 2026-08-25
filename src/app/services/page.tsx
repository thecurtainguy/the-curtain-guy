import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceCard } from "@/components/marketing/service-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { services } from "@/data/services";
import { createPageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export const metadata: Metadata = createPageMetadata({
  title: "Luxury Event Drape Rental Services in Montreal",
  description:
    "Explore luxury event drape rental services in Montreal — wedding draping, pipe and drape, corporate and gala draping, stage backdrops, blackout dividers, and Bar/Bat Mitzvah draping.",
  path: "/services",
});

export default function ServicesHubPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Luxury Event Drape Rental Services in Montreal"
        description="Temporary event draping for weddings, corporate events, galas, celebrations, stages, and venue transformations — with delivery, installation, and teardown. Not residential curtains. Not e-commerce."
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">Start your event drape brief</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/contact">Contact The Curtain Guy</Link>
          </Button>
        </div>
      </PageHero>

      <section className="border-b border-border/40">
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="relative aspect-[21/9] min-h-[150px] overflow-hidden rounded-2xl border border-border/40 sm:min-h-[220px]">
            <SiteMediaImage
              mediaKey="services.hub.hero"
              sizes="100vw"
              className="absolute inset-0"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="fabric-section-overlay pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>

          <Card className="mt-12 border-border/40 bg-card/40">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    Not sure what you need?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Build a planning brief in minutes. Share your venue, event
                    type, and draping goals — we review and follow up with a
                    rental estimate conversation. No automatic final pricing.
                  </p>
                </div>
              </div>
              <Button asChild className="min-h-11 shrink-0 w-full sm:w-auto">
                <Link href="/get-estimate">Plan your drape rental</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline="Tell us what you are planning."
        description="Request an estimate for luxury event drape rental in Montreal and surrounding areas."
      />
    </>
  );
}
