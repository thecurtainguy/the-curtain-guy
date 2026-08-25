import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { ContactForm } from "@/components/contact/contact-form";
import { siteConfig } from "@/data/site";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { MapPin, Mail, Phone } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Our Montreal Event Drape Rental Team",
  description:
    "Contact The Curtain Guy for luxury event drape rentals in Montreal. Email us about wedding draping, pipe and drape, corporate event draping, stage backdrops, and venue transformations.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Contact our Montreal event drape rental team."
        description="Reach out to discuss your venue, event type, and draping goals. We provide full-service event curtain rentals with delivery, installation, and teardown across Montreal and surrounding areas."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 overflow-hidden rounded-2xl border border-border/40">
            <div className="relative aspect-[21/9] min-h-[140px] sm:min-h-[200px]">
              <SiteMediaImage
                mediaKey="contact.atmosphere"
                sizes="100vw"
                className="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/55 via-transparent via-30% to-transparent dark:from-background dark:via-background/20 dark:to-transparent" />
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Plan your event draping
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Whether you need wedding draping, corporate event draping,
                  gala drape rentals, Bar Mitzvah or Bat Mitzvah draping, stage
                  backdrop rentals, or a full venue transformation — our team
                  helps shape the right temporary drape setup for your space.
                  This is event drape rental, not residential window treatment
                  sales.
                </p>
              </div>

              <div className="space-y-4">
                <Card className="border-border/40 bg-card/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Phone className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Phone
                      </p>
                      <a
                        href={siteConfig.phoneHref}
                        className="mt-1 block text-sm text-primary hover:underline"
                      >
                        {siteConfig.phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email
                      </p>
                      <a
                        href={`mailto:${siteConfig.email}`}
                        className="mt-1 block text-sm text-primary hover:underline"
                      >
                        {siteConfig.email}
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Service area
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {siteConfig.location}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button asChild className="min-h-11">
                <Link href="/get-estimate">Get Estimate</Link>
              </Button>
            </div>

            <Card className="border-border/40 bg-card/40">
              <CardContent className="pt-6">
                <h2 className="font-heading text-lg font-medium text-foreground">
                  Send a message
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Share your event type, venue, date, and draping goals. We
                  typically respond within one business day.
                </p>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <QuoteCTA />
    </>
  );
}
