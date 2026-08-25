import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { areas, getAreaBySlug } from "@/data/areas";
import { getServiceBySlug } from "@/data/services";
import type { SiteMediaKey } from "@/data/site-media";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { findSiteMedia } from "@/lib/site-media";
import { createBreadcrumbJsonLd, createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, MapPin } from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) return {};

  return createPageMetadata({
    title: area.metaTitle,
    description: area.metaDescription,
    path: `/areas/${area.slug}`,
  });
}

export default async function AreaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();

  const relatedServices = area.relatedServiceSlugs
    .map((s) => getServiceBySlug(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const Icon = area.icon;
  const hero = findSiteMedia(`areas.${slug}.hero`);
  const atmosphere = findSiteMedia(`areas.${slug}.atmosphere`);
  const heroKey = hero?.key as SiteMediaKey | undefined;
  const atmosphereKey = atmosphere?.key as SiteMediaKey | undefined;

  return (
    <>
      <JsonLd
        data={createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: area.name, path: `/areas/${area.slug}` },
        ])}
      />
      <PageHero
        eyebrow={`${area.name} · Service Area`}
        title={area.title}
        description={area.intro}
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

      {heroKey && (
        <section className="border-b border-border/40">
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="relative aspect-[21/9] min-h-[160px] overflow-hidden rounded-2xl border border-border/40 sm:min-h-[220px]">
              <SiteMediaImage
                mediaKey={heroKey}
                sizes="100vw"
                className="absolute inset-0"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                  Serving {area.name}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/40 bg-card/25 lg:col-span-2">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Icon className="size-5" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Services available in {area.name}
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {area.servicesAvailable.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/40 bg-card/25 p-0">
              {atmosphereKey ? (
                <div className="relative aspect-[4/3]">
                  <SiteMediaImage
                    mediaKey={atmosphereKey}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="absolute inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 backdrop-blur-sm">
                      <MapPin className="size-4" />
                    </div>
                    <h2 className="font-heading text-lg font-medium text-foreground">
                      Event types
                    </h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {area.eventTypes.map((item) => (
                        <li
                          key={item}
                          className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-foreground/90 backdrop-blur-sm"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <CardContent className="p-6">
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    Event types
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {area.eventTypes.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-border/40 bg-background/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          </div>

          <Card className="mt-6 border-border/40 bg-card/25">
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Planning considerations
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The Curtain Guy serves {area.name} and surrounding Montreal
                areas. We do not claim a local storefront address on this page —
                share your venue details in the estimate brief so we can plan
                delivery and install correctly.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {area.planningNotes.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 rounded-xl border border-border/40 bg-background/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {relatedServices.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Explore key services
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {relatedServices.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <ArrowRight className="size-3.5" />
                    {service.shortTitle}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline={`Plan event draping in ${area.name}.`}
        description="Start your drape rental brief with venue details, event type, and goals. We review and follow up — no fake online pricing."
      />
    </>
  );
}
