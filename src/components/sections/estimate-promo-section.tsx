import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EstimatePromoSection() {
  return (
    <SectionShell variant="glow" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-border/40 bg-card/40">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
                Estimate builder
              </p>
              <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Build a planning brief in minutes.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Share event details, draping goals, and notes. Upload floor plans
                or venue photos and keep requests in your account — then our
                team reviews and follows up with a rental estimate conversation.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-11">
                  <Link href="/get-estimate">
                    Request an Estimate
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="min-h-11">
                  <Link href="/contact">Contact The Curtain Guy</Link>
                </Button>
              </div>
              <div className="mt-6 flex gap-3 rounded-2xl border border-border/40 bg-background/50 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Upload className="size-4" />
                </div>
                <div>
                  <p className="font-heading text-sm font-medium text-foreground">
                    Uploads & account
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Attach inspiration photos or floor plans with your request.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-full">
              <SiteMediaImage
                mediaKey="home.estimate.promo"
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/20 to-transparent lg:from-card/60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
