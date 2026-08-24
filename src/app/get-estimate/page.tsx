import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { EstimateBuilder } from "@/components/estimate/estimate-builder";
import { EstimateIntroSection } from "@/components/estimate/estimate-intro-section";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Get an Event Drape Rental Estimate",
  description:
    "Build your event drape rental estimate for Montreal weddings, corporate events, galas, and venue transformations. Guided pipe and drape, wedding draping, stage backdrop, and blackout drape planning — with full-service delivery, installation, and strike.",
  path: "/get-estimate",
});

export default function GetEstimatePage() {
  return (
    <>
      <PageHero
        eyebrow="Get Estimate"
        title="Build your event drape rental estimate."
        description="This guided estimate helps us understand your event, drape goals, venue needs, measurements, and add-ons — so we can shape the right pipe and drape rental setup for Montreal. No final pricing yet; just a clear planning brief for our team."
        className="[&>div]:py-12 sm:[&>div]:py-14 lg:[&>div]:py-16"
      />

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <EstimateIntroSection />

          <div className="rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/30 p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8 lg:p-10">
            <EstimateBuilder />
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Prefer to explore the future experience?{" "}
            <Link href="/ai" className="text-primary hover:underline">
              See AI Drape Studio
            </Link>{" "}
            — floor plan upload, room drawing, and 3D preview coming in later
            phases.
          </p>
        </div>
      </section>
    </>
  );
}
