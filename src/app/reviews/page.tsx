import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { ReviewsShowcase } from "@/components/reviews/reviews-showcase";
import { ShareExperienceDialog } from "@/components/reviews/share-experience-dialog";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Client Reviews & Testimonials",
  description:
    "Luxury event drape rental reviews from Montreal clients — wedding draping, corporate installs, gala transformations, mitzvah celebrations, and production partners.",
  path: "/reviews",
});

export default function ReviewsPage() {
  return (
    <>
      <PageHero
        eyebrow="Reviews"
        title="Event drape rental feedback from Montreal clients."
        description="From wedding backdrops to corporate keynotes and gala stage surrounds — see how planners, venues, and hosts describe our full-service drape rental experience."
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">Request an Estimate</Link>
          </Button>
          <ShareExperienceDialog>
            <Button variant="outline" size="lg" className="min-h-11">
              Share your experience
            </Button>
          </ShareExperienceDialog>
        </div>
      </PageHero>

      <ReviewsShowcase />

      <QuoteCTA />
    </>
  );
}
