import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { QuoteCTA } from "@/components/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { MediaVisual } from "@/components/media-visual";
import { siteConfig } from "@/data/site";
import { getSiteMedia } from "@/lib/site-media";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About Our Montreal Event Drape Rental Company",
  description:
    "Learn about The Curtain Guy — a Montreal luxury event drape rental company providing full-service temporary draping for weddings, corporate events, galas, mitzvahs, and venue transformations. Not window treatments.",
  path: "/about",
});

const aboutMedia = getSiteMedia("about.primary");

const values = [
  {
    title: "Event draping, not window treatments",
    description:
      "We rent and install temporary drape for live events — weddings, galas, corporate functions, and productions. We are not a residential curtain store or e-commerce shop.",
  },
  {
    title: "Transformation-first approach",
    description:
      "Every setup is designed around outcomes — masking walls, creating backdrops, room divider draping, stage surrounds, and building atmosphere.",
  },
  {
    title: "Full-service drape rental",
    description:
      "Rental inventory, delivery, professional installation, and teardown are included. Hardware, rigging safety, and finishing details are managed by experienced crews.",
  },
  {
    title: "Montreal and surrounding areas",
    description:
      "Based in Montreal, serving the city and surrounding communities with local venue knowledge and responsive event support.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Montreal's luxury event drape rental specialists."
        description={siteConfig.positioning}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="mx-auto max-w-3xl lg:mx-0">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                What we do
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                The Curtain Guy provides premium temporary draping for weddings,
                corporate events, galas, Bar Mitzvah and Bat Mitzvah celebrations,
                stage productions, trade shows, and full-room venue
                transformations. Our event curtain rentals include pipe and
                drape, wedding draping, stage backdrop rentals, blackout drape,
                step-and-repeat backdrops, and room divider draping — all
                installed and struck by our team.
              </p>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Every project begins with your venue, your event type, and the
                atmosphere you want to create. Whether you need gala drape rentals
                for a ballroom perimeter, corporate event draping for a product
                launch, or venue transformation drape rentals for a celebration,
                we shape the right setup and handle full-service drape installation
                and teardown on event day.
              </p>
            </div>
            <MediaVisual
              image={aboutMedia.path}
              alt={aboutMedia.alt}
              className="mx-auto w-full max-w-md shadow-2xl shadow-black/40"
            />
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title} className="border-border/40 bg-card/40">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-base font-medium text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <QuoteCTA
        headline="Let's plan your venue transformation."
        description={`Share your event vision with our Montreal team. We serve ${siteConfig.location} with full-service event drape rental.`}
      />
    </>
  );
}
