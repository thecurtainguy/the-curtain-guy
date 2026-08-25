import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { services } from "@/data/services";
import { areas } from "@/data/areas";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().replace(/\/$/, "");
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1, lastModified },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7, lastModified },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.9, lastModified },
    { url: `${base}/gallery`, changeFrequency: "weekly", priority: 0.8, lastModified },
    { url: `${base}/reviews`, changeFrequency: "monthly", priority: 0.5, lastModified },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.8, lastModified },
    { url: `${base}/get-estimate`, changeFrequency: "weekly", priority: 0.95, lastModified },
    { url: `${base}/ai`, changeFrequency: "monthly", priority: 0.5, lastModified },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3, lastModified },
  ];

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${base}/services/${service.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
    lastModified,
  }));

  const areaPages: MetadataRoute.Sitemap = areas.map((area) => ({
    url: `${base}/areas/${area.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
    lastModified,
  }));

  return [...staticPages, ...servicePages, ...areaPages];
}
