import type { Metadata } from "next";
import { QuoteCTA } from "@/components/page-hero";
import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { ServicesSection } from "@/components/sections/services-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { EstimatePromoSection } from "@/components/sections/estimate-promo-section";
import { GalleryTeaserSection } from "@/components/sections/gallery-teaser-section";
import { AreasTeaserSection } from "@/components/sections/areas-teaser-section";
import { AiTeaserSection } from "@/components/sections/ai-teaser-section";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Luxury Event Drape Rentals Montreal",
  description:
    "Luxury event drape rentals in Montreal — premium draping, pipe and drape, backdrops, blackout masking, and venue transformations for weddings, galas, corporate events, and celebrations.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <ServicesSection />
      <HowItWorksSection />
      <EstimatePromoSection />
      <GalleryTeaserSection />
      <AreasTeaserSection />
      <AiTeaserSection />
      <QuoteCTA
        headline="Tell us what you are planning."
        description="Share your venue, event type, and draping goals. We review your brief and follow up with a rental estimate conversation — full-service delivery, installation, and strike."
      />
    </>
  );
}
