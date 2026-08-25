import type { Metadata } from "next";
import type { FaqItem } from "@/data/faq";
import { navLinks, siteConfig } from "@/data/site";
import { getSiteUrl } from "@/lib/env";

function baseUrl() {
  return getSiteUrl().replace(/\/$/, "");
}

const seoNavExtras = [
  { label: "Get Estimate", href: "/get-estimate" },
  { label: "FAQ", href: "/faq" },
  { label: "Reviews", href: "/reviews" },
] as const;

function organizationNode(base: string) {
  return {
    "@type": "LocalBusiness",
    "@id": `${base}/#organization`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: base,
    email: siteConfig.email,
    telephone: siteConfig.phone,
    logo: `${base}/images/brand/logo-full.png`,
    image: `${base}/images/brand/logo-full.png`,
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
}

export function buildSiteGraphJsonLd() {
  const base = baseUrl();
  const navItems = [...navLinks, ...seoNavExtras];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en-CA",
        publisher: { "@id": `${base}/#organization` },
      },
      organizationNode(base),
      {
        "@type": "SiteNavigationElement",
        "@id": `${base}/#main-navigation`,
        name: "Main navigation",
        hasPart: navItems.map((link) => ({
          "@type": "WebPage",
          name: link.label,
          url: `${base}${link.href === "/" ? "" : link.href}`,
        })),
      },
    ],
  };
}

/** @deprecated Use buildSiteGraphJsonLd() — kept for any legacy imports. */
export const organizationJsonLd = organizationNode("https://www.thecurtainguy.com");

export function createBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  const base = baseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${base}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function createFaqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
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
