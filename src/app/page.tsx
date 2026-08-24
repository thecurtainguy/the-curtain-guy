import type { Metadata } from "next";
import { QuoteCTA } from "@/components/page-hero";
import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { TransformationSection } from "@/components/sections/transformation-section";
import { ServicesSection } from "@/components/sections/services-section";
import { AiTeaserSection } from "@/components/sections/ai-teaser-section";
import { WhySection } from "@/components/sections/why-section";
import { GalleryTeaserSection } from "@/components/sections/gallery-teaser-section";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Luxury Event Drape Rentals Montreal",
  description:
    "Full-service luxury event drape and curtain rentals in Montreal. Wedding draping, pipe and drape, corporate event draping, gala drape rentals, stage backdrops, blackout drape, and venue transformations with delivery, installation, and teardown.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <TransformationSection />
      <ServicesSection />
      <AiTeaserSection />
      <WhySection />
      <GalleryTeaserSection />
      <QuoteCTA />
    </>
  );
}
