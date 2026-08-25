import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/animation/reveal";

export const metadata: Metadata = createPageMetadata({
  title: "Client Reviews",
  description:
    "Client reviews and event feedback for The Curtain Guy luxury event drape rentals in Montreal. Wedding draping, corporate event draping, and venue transformation testimonials coming soon.",
  path: "/reviews",
});

export default function ReviewsPage() {
  return (
    <>
      <PageHero
        eyebrow="Reviews"
        title="Event drape rental feedback from Montreal clients."
        description="Client reviews and event feedback will be featured here soon. We work with planners, venues, and hosts on wedding draping, corporate event draping, gala drape rentals, and venue transformations."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up">
          <Card className="mx-auto max-w-2xl border-border/40 bg-card/40">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquare className="size-7" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Reviews coming soon
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                We&apos;re gathering feedback from weddings, corporate events,
                galas, mitzvahs, and venue transformation projects across
                Montreal. Check back soon for client stories about our
                full-service event drape rental experience.
              </p>
              <Button asChild variant="outline" className="mt-8">
                <Link href="/contact">
                  Worked with us? Share your experience.
                </Link>
              </Button>
            </CardContent>
          </Card>
          </Reveal>
        </div>
      </section>

      <QuoteCTA />
    </>
  );
}
