import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/api",
          "/api/",
          "/auth",
          "/auth/",
          "/quote",
          "/quote/",
          "/studio/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
