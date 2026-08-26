import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { services } from "@/data/services";
import { areas } from "@/data/areas";
import { routing } from "@/i18n/routing";

const phase1StaticPaths = [
  "/",
  "/about",
  "/services",
  "/gallery",
  "/reviews",
  "/contact",
  "/faq",
  "/get-estimate",
  "/privacy",
  "/studio",
] as const;

function localizedUrl(base: string, path: string, locale: string) {
  const normalized = path === "/" ? "" : path;
  const suffix = locale === "fr" ? `/fr${normalized}` : normalized || "";
  return `${base}${suffix || "/"}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().replace(/\/$/, "");
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of phase1StaticPaths) {
      entries.push({
        url: localizedUrl(base, path, locale),
        changeFrequency: path === "/" || path === "/get-estimate" ? "weekly" : "monthly",
        priority:
          path === "/"
            ? 1
            : path === "/get-estimate"
              ? 0.95
              : path === "/services"
                ? 0.9
                : 0.75,
        lastModified,
      });
    }

    for (const service of services) {
      entries.push({
        url: localizedUrl(base, `/services/${service.slug}`, locale),
        changeFrequency: "monthly",
        priority: 0.85,
        lastModified,
      });
    }

    for (const area of areas) {
      entries.push({
        url: localizedUrl(base, `/areas/${area.slug}`, locale),
        changeFrequency: "monthly",
        priority: 0.75,
        lastModified,
      });
    }
  }

  // Phase 2 — English-only routes (no /fr prefix)
  entries.push({
    url: `${base}/ai`,
    changeFrequency: "monthly",
    priority: 0.5,
    lastModified,
  });

  return entries;
}
