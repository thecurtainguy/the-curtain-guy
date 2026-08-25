import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRelatedServices,
  getServiceBySlug,
  services,
} from "@/data/services";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { serviceMediaKeys } from "@/lib/site-media";
import { createBreadcrumbJsonLd, createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import type { SiteMediaKey } from "@/data/site-media";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return createPageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const related = getRelatedServices(slug);
  const Icon = service.icon;
  const media = serviceMediaKeys(slug);
  const heroKey = media.hero?.key as SiteMediaKey | undefined;
  const asideKey = media.aside?.key as SiteMediaKey | undefined;
  const detailKey = media.detail?.key as SiteMediaKey | undefined;

  return (
    <>
      <JsonLd
        data={createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />
      <PageHero
        eyebrow="Event Drape Rental"
        title={service.title}
        description={service.intro}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">Request an Estimate</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/contact">Contact The Curtain Guy</Link>
          </Button>
        </div>
      </PageHero>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-8">
              <Reveal variant="slide-left">
              <Card className="border-border/40 bg-card/25">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">
                    What this service is
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {service.whatItIs}
                  </p>
                </CardContent>
              </Card>
              </Reveal>

              <Stagger className="grid gap-4 sm:grid-cols-2">
                <AnimatedCard hover={false}>
                <Card className="border-border/40 bg-card/25">
                  <CardContent className="p-6">
                    <h2 className="font-heading text-lg font-medium text-foreground">
                      Best use cases
                    </h2>
                    <ul className="mt-4 space-y-3">
                      {service.bestUseCases.map((item) => (
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
                </AnimatedCard>

                <AnimatedCard hover={false}>
                <Card className="border-border/40 bg-card/25">
                  <CardContent className="p-6">
                    <h2 className="font-heading text-lg font-medium text-foreground">
                      What affects planning
                    </h2>
                    <ul className="mt-4 space-y-3">
                      {service.planningFactors.map((item) => (
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
                </AnimatedCard>
              </Stagger>

              <Reveal variant="fade-up">
              <Card className="border-border/40 bg-card/25">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    What The Curtain Guy handles
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {service.whatWeHandle.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 rounded-xl border border-border/40 bg-background/40 px-3.5 py-3 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              </Reveal>

              {service.faq.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-heading text-xl font-semibold text-foreground">
                    Common questions
                  </h2>
                  <div className="grid gap-3">
                    {service.faq.map((item) => (
                      <Card
                        key={item.question}
                        className="border-border/40 bg-card/25"
                      >
                        <CardContent className="p-5 sm:p-6">
                          <h3 className="font-heading text-base font-medium text-foreground">
                            {item.question}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {item.answer}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <Reveal variant="scale-in">
              <Card className="overflow-hidden border-border/40 bg-card/30">
                <div className="relative aspect-[4/3]">
                  {(asideKey || heroKey) && (
                    <SiteMediaImage
                      mediaKey={(asideKey || heroKey)!}
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="absolute inset-0"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/90">
                      Inspiration example
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {service.shortTitle}
                    </p>
                  </div>
                </div>
                <CardContent className="space-y-3 p-5">
                  <Button asChild className="min-h-11 w-full">
                    <Link href="/get-estimate">Request an Estimate</Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-11 w-full">
                    <Link href="/contact">Contact</Link>
                  </Button>
                  <Button asChild variant="ghost" className="min-h-11 w-full">
                    <Link href="/services">
                      All services
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              </Reveal>

              {related.length > 0 && (
                <Card className="border-border/40 bg-card/25">
                  <CardContent className="p-5">
                    <h2 className="text-sm font-medium text-foreground">
                      Related services
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {related.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={`/services/${item.slug}`}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                          >
                            <ArrowRight className="size-3.5 text-primary/70" />
                            {item.shortTitle}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>

          {detailKey && (
            <Reveal variant="scale-in" className="mt-10 overflow-hidden rounded-2xl border border-border/40">
              <div className="relative aspect-[21/9] min-h-[180px] sm:min-h-[240px]">
                <SiteMediaImage
                  mediaKey={detailKey}
                  sizes="100vw"
                  className="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-end p-6 sm:p-8">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                    Visual context
                  </p>
                  <p className="mt-2 font-heading text-lg font-medium text-foreground sm:text-xl">
                    Planned around your Montreal venue
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Inspiration imagery — owner project photography will replace
                    stock as events are documented.
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline={`Plan ${service.shortTitle.toLowerCase()} for your Montreal event.`}
        description="Share your venue, date, and draping goals. We review your brief and follow up with a rental estimate conversation."
      />
    </>
  );
}
