import type { Metadata } from "next";
import type { FaqItem } from "@/data/faq";
import { siteConfig } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import type { AppLocale } from "@/i18n/routing";

function baseUrl() {
  return getSiteUrl().replace(/\/$/, "");
}

function localizedPath(path: string, locale: AppLocale) {
  const normalized = path === "/" ? "" : path;
  return locale === "fr" ? `/fr${normalized}` : normalized || "/";
}

function absoluteUrl(path: string, locale: AppLocale) {
  const localized = localizedPath(path, locale);
  const suffix = localized === "/" ? "" : localized;
  return `${baseUrl()}${suffix}`;
}

export function buildSiteGraphJsonLd(navItems: Array<{ label: string; href: string }>) {
  const base = baseUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: ["en-CA", "fr-CA"],
        publisher: { "@id": `${base}/#organization` },
      },
      {
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
      },
      {
        "@type": "SiteNavigationElement",
        "@id": `${base}/#main-navigation`,
        name: "Main navigation",
        hasPart: navItems.flatMap((link) => {
          const enPath = link.href === "/" ? "" : link.href;
          const frPath = `/fr${enPath}`;
          return [
            {
              "@type": "WebPage",
              name: link.label,
              url: `${base}${enPath}`,
              inLanguage: "en-CA",
            },
            {
              "@type": "WebPage",
              name: link.label,
              url: `${base}${frPath}`,
              inLanguage: "fr-CA",
            },
          ];
        }),
      },
    ],
  };
}

/** @deprecated Use buildSiteGraphJsonLd() — kept for any legacy imports. */
export const organizationJsonLd = {
  "@type": "LocalBusiness",
  "@id": "https://www.thecurtainguy.com/#organization",
  name: siteConfig.name,
};

export function createBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
  locale: AppLocale = "en"
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, locale),
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
  locale = "en",
}: {
  title: string;
  description: string;
  path?: string;
  locale?: AppLocale;
}): Metadata {
  const canonical = absoluteUrl(path, locale);
  const enUrl = absoluteUrl(path, "en");
  const frUrl = absoluteUrl(path, "fr");

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        "fr-CA": frUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      type: "website",
    },
  };
}
