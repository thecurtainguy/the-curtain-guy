import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { aiPaths, aiFeatures } from "@/data/site";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaVisual } from "@/components/media-visual";
import { getSiteMedia } from "@/lib/site-media";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Drape Studio — Coming Soon",
  description:
    "Coming soon: AI-powered floor plan upload, manual room drawing, and interactive 3D drape preview for luxury event drape rentals in Montreal. Plan pipe and drape, wedding draping, and venue transformations before installation.",
  path: "/ai",
});

const aiMedia = getSiteMedia("ai.studio.primary");

export default function AiStudioPage() {
  return (
    <>
      <PageHero
        eyebrow="AI Drape Studio"
        title="Plan your Montreal event draping before installation day."
        description="The Curtain Guy is building an advanced drape design experience for event rentals — upload a floor plan or draw your room, then configure pipe and drape, stage backdrops, room dividers, and blackout zones in an interactive 3D studio."
      >
        <Badge className="mt-6 bg-primary/20 text-primary">
          <Sparkles className="size-3" />
          Coming Soon
        </Badge>
      </PageHero>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Two paths to your event drape rental estimate
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Whether you have a venue floor plan or need to sketch from
                scratch, both paths lead to the same interactive 3D drape
                preview — where you can configure every detail of your Montreal
                event draping before requesting a final estimate.
              </p>

              <div className="mt-8 space-y-4">
                {aiPaths.slice(0, 2).map((path) => {
                  const Icon = path.icon;
                  return (
                    <Card key={path.title} className="border-border/40 bg-card/40">
                      <CardContent className="flex items-start gap-4 pt-6">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-heading text-sm font-medium text-foreground">
                            {path.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {path.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="size-5 text-primary" />
                </div>

                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-medium text-foreground">
                        Interactive 3D Drape Preview
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Configure color, fullness, rail placement, height,
                        stage backdrops, room dividers, blackout zones, and
                        add-ons — then submit for a final event drape rental
                        estimate.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <MediaVisual
              image={aiMedia.path}
              alt={aiMedia.alt}
              className="mx-auto shadow-2xl shadow-black/40 ring-1 ring-white/5"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Studio features in development
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The AI Drape Studio will let you design every aspect of your
            temporary event draping — from pipe and drape rental layouts to
            wedding draping and venue transformation plans — before our team
            finalizes your estimate.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {aiFeatures.map((feature) => (
              <Badge key={feature} variant="outline" className="text-muted-foreground">
                {feature}
              </Badge>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/get-estimate">Start with Get Estimate</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <QuoteCTA
        headline="The future of Montreal event draping is on its way."
        description="While we build the AI Drape Studio, our team is ready to help you plan your venue transformation drape rental today — with full-service delivery, installation, and teardown."
      />
    </>
  );
}
