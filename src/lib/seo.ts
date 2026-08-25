import type { Metadata } from "next";
import { siteConfig } from "@/data/site";
import { getSiteUrl } from "@/lib/env";

function baseUrl() {
  return getSiteUrl().replace(/\/$/, "");
}

export function createPageMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = `${baseUrl()}${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: { canonical: url || baseUrl() },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: url || baseUrl(),
      siteName: siteConfig.name,
      locale: "en_CA",
      type: "website",
    },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: siteConfig.name,
  description: siteConfig.description,
  url: `https://${siteConfig.domain}`,
  email: siteConfig.email,
  telephone: siteConfig.phone,
  logo: `https://${siteConfig.domain}/images/brand/logo-full.png`,
  image: `https://${siteConfig.domain}/images/brand/logo-full.png`,
  areaServed: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "City",
      name: "Montreal",
    },
    geoRadius: "75000",
  },
  serviceType: [
    "Event drape rental",
    "Pipe and drape rental",
    "Wedding draping",
    "Corporate event draping",
    "Stage backdrop rental",
    "Venue transformation draping",
    "Blackout drape rental",
    "Room divider draping",
  ],
  knowsAbout: [
    "Luxury event drape rentals",
    "Temporary event draping",
    "Full-service drape installation and teardown",
    "Montreal event production draping",
  ],
};
