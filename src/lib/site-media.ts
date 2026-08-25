import {
  SITE_MEDIA,
  type SiteMediaKey,
  type SiteMediaSlot,
} from "@/data/site-media";

/**
 * Resolve a media slot by key.
 * Today: local typed registry (build-time, fast, static-friendly).
 * Later: override `path` from Supabase `site_image_slots.image_url` using the same key.
 */
export function getSiteMedia(key: SiteMediaKey): SiteMediaSlot {
  return SITE_MEDIA[key];
}

export function getSiteMediaSrc(key: SiteMediaKey): string {
  return SITE_MEDIA[key].path;
}

export function getSiteMediaAlt(key: SiteMediaKey): string {
  return SITE_MEDIA[key].alt;
}

/** Safe lookup when key is built dynamically */
export function findSiteMedia(key: string): SiteMediaSlot | undefined {
  if (key in SITE_MEDIA) {
    return SITE_MEDIA[key as SiteMediaKey];
  }
  return undefined;
}

export function serviceMediaKeys(slug: string): {
  hero?: SiteMediaSlot;
  aside?: SiteMediaSlot;
  detail?: SiteMediaSlot;
  card?: SiteMediaSlot;
} {
  return {
    hero: findSiteMedia(`services.${slug}.hero`),
    aside: findSiteMedia(`services.${slug}.aside`),
    detail: findSiteMedia(`services.${slug}.detail`),
    card: findSiteMedia(
      slug === "wedding-draping"
        ? "home.services.wedding"
        : slug === "pipe-and-drape-rental"
          ? "home.services.pipe_drape"
          : slug === "corporate-event-draping"
            ? "home.services.corporate"
            : slug === "stage-backdrop-rentals"
              ? "home.services.stage"
              : slug === "blackout-room-divider-drapes"
                ? "home.services.blackout"
                : slug === "bar-bat-mitzvah-draping"
                  ? "home.services.mitzvah"
                  : ""
    ),
  };
}
