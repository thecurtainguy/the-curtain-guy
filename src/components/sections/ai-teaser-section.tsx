import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { aiPaths } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AiTeaserSection() {
  return (
    <SectionShell variant="glow" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Coming Soon"
          title="Estimate smarter. Visualize before you rent."
          description="The Curtain Guy is building a guided estimate and drape visualization experience for Montreal event rentals — so you can plan pipe and drape, wedding draping, and venue transformations before installation day."
          align="center"
          className="mx-auto"
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {aiPaths.map((path, index) => {
            const Icon = path.icon;
            const isFinal = index === aiPaths.length - 1;

            return (
              <Card
                key={path.title}
                className={`relative border-border/40 bg-card/40 shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${
                  isFinal
                    ? "border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
                    : ""
                }`}
              >
                <CardContent className="pt-6">
                  {isFinal && (
                    <Badge className="mb-3 bg-primary/20 text-primary">
                      Destination
                    </Badge>
                  )}
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-heading text-base font-medium text-foreground">
                    {path.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {path.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/get-estimate">
              Start with Get Estimate
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ai">
              <Sparkles className="size-4" />
              Preview AI Studio
            </Link>
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}
