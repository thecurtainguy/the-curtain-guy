import type { Metadata } from "next";
import { siteConfig } from "@/data/site";

const baseUrl = `https://${siteConfig.domain}`;

export function createPageMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = `${baseUrl}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
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
  url: baseUrl,
  email: siteConfig.email,
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
