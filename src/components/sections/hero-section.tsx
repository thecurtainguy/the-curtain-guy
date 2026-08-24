import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/hero-visual";
import { SectionShell } from "@/components/section-shell";

export function HeroSection() {
  return (
    <SectionShell variant="glow" className="overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(212,175,55,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
            Luxury Event Drape Rentals — Montreal
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Luxury event drape rentals that transform Montreal venues.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The Curtain Guy provides full-service pipe and drape rental in
            Montreal — wedding draping, corporate event draping, stage backdrop
            rentals, blackout drape, room divider draping, and complete venue
            transformation for galas and celebrations. Delivery, installation,
            and teardown included. Event draping, not window treatments.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/get-estimate">
                Get Estimate
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/gallery">Explore Gallery</Link>
            </Button>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <div className="relative w-full max-w-md lg:max-w-none lg:w-auto">
            <div
              className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),transparent_65%)] blur-3xl"
              aria-hidden
            />
            <div
              className="absolute -inset-2 rounded-[2rem] bg-[radial-gradient(ellipse_at_40%_20%,rgba(212,175,55,0.12),transparent_60%)]"
              aria-hidden
            />
            <HeroVisual className="relative z-10" />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
