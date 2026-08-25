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
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

export const metadata: Metadata = createPageMetadata({
  title: "AI Design Assistance — Coming Next",
  description:
    "Draw Your Room Studio is available now. AI-assisted floor-plan upload and drape placement are planned for a future phase.",
  path: "/ai",
});

const aiMedia = getSiteMedia("ai.studio.primary");

export default function AiStudioPage() {
  return (
    <>
      <PageHero
        eyebrow="Studio roadmap"
        title="Draw Your Room is here. AI assistance comes next."
        description="The first version of The Curtain Guy Studio lets you draw a room, place event draping and a stage, and generate an interactive 3D preview. AI floor-plan upload and automatic design suggestions are not available yet."
      >
        <Badge className="mt-6 bg-primary/20 text-primary">
          <Sparkles className="size-3" />
          AI assistance coming soon
        </Badge>
      </PageHero>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal variant="blur-in">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                A precise foundation before AI
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The live Studio starts with manual room drawing so every wall,
                drape run, opening, and stage is stored as clean room data. A
                future AI phase will work with that same design instead of
                creating a disconnected model.
              </p>

              <Stagger className="mt-8 space-y-4" stagger={0.08}>
                {aiPaths.slice(0, 2).map((path) => {
                  const Icon = path.icon;
                  return (
                    <AnimatedCard key={path.title} hover={false}>
                      <Card className="border-border/40 bg-card/40">
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
                    </AnimatedCard>
                  );
                })}

                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="size-5 text-primary" />
                </div>

                <AnimatedCard variant="scale-in" hover={false}>
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                    <CardContent className="flex items-start gap-4 pt-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Sparkles className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-medium text-foreground">
                          Draw Your Room Studio — available now
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Draw in 2D, configure drape runs and a stage, then
                          inspect the same design in a generated 3D room.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </Stagger>
            </Reveal>

            <Reveal variant="scale-in" delay={0.1}>
              <MediaVisual
                image={aiMedia.path}
                alt={aiMedia.alt}
                className="mx-auto shadow-2xl shadow-black/40 ring-1 ring-white/5"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              AI features planned for later phases
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Floor-plan upload, room detection, and placement suggestions
              remain on the roadmap. They are intentionally separate from this
              first manual Studio release.
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
                <Link href="/studio/new">Start drawing your room</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/get-estimate">Get estimate</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <QuoteCTA
        headline="Start with a room you can draw and inspect today."
        description="Build a practical room design now, then work with our team on your venue transformation with full-service delivery, installation, and teardown."
      />
    </>
  );
}
