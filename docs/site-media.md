# Site media system — The Curtain Guy

How public-site photography is organized, keyed, and replaced.

## Source of truth (code)

| Piece | Path |
|-------|------|
| Typed slot registry | `src/data/site-media.ts` |
| Resolver helpers | `src/lib/site-media.ts` |
| Image component | `src/components/media/site-media-image.tsx` |
| Local files | `public/images/...` |
| License log | `public/images/IMAGE-SOURCES.md` |
| **Schema migration** | `supabase/migrations/20260825031500_tcg_site_image_slots.sql` |
| Seed SQL | `scripts/seed-site-image-slots.sql` |
| Seed generator | `scripts/generate-site-media-seed.ts` |

**Today the site renders from the local registry** (fast, static-friendly). Keys match Supabase 1:1.

## Supabase (project `xszhnecwhjcywhqjzfit`)

Table: `public.site_image_slots`

- **Schema** is tracked in `supabase/migrations/20260825031500_tcg_site_image_slots.sql`
- **Seed data** is in `scripts/seed-site-image-slots.sql` (run separately; not part of the migration)
- The table was already applied manually/MCP in the current Supabase project; the migration file keeps the repo in sync for future environments

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `key` | Stable slot id (e.g. `home.hero.primary`) — unique; **never rename casually** |
| `page` | Route, e.g. `/services/wedding-draping` |
| `section` | UI section name |
| `title` | Human label for Benny |
| `image_url` | Local path (`/images/...`) or future CDN / Storage URL |
| `alt_text` | Accessibility text |
| `caption` / `notes` | Optional context |
| `sort_order` | Ordering within a section |
| `is_active` | Soft on/off |

RLS: public can **select** active rows; **owners** can manage all rows (`public.is_owner`).

MCP: use only `supabase-thecurtainguy` for this project.

## Slot naming

```
{page}.{section}.{role}
```

Examples:

- `home.hero.primary`
- `home.services.wedding`
- `services.wedding-draping.aside`
- `areas.montreal.hero`
- `gallery.wedding.1`

## Folder layout

```
public/images/
  home/          # homepage slots
  services/      # hub + per-service heroes/cards
  areas/         # area heroes + atmosphere
  gallery/       # category inspiration (wedding/, stage/, …)
  about/
  ai/
  estimate/
  contact/
  cta/
  IMAGE-SOURCES.md
```

## How Benny replaces an image

### A) Local file swap (current site)

1. Find the slot key in `src/data/site-media.ts` (or in Supabase Table Editor).
2. Note the `path` / `image_url` (e.g. `/images/services/wedding-hero.jpg`).
3. Replace the file at `public/images/...` with the same filename **or** update `path` in `site-media.ts` to a new filename.
4. Update `public/images/IMAGE-SOURCES.md` (source, license, alt, date).
5. Optionally re-run seed so Supabase stays in sync:
   `pnpm dlx tsx scripts/generate-site-media-seed.ts`
   then run `scripts/seed-site-image-slots.sql` in Supabase SQL editor.

### B) Supabase URL swap (future)

1. Open Table Editor → `site_image_slots`.
2. Find row by `key`.
3. Set `image_url` to a public CDN or Storage URL.
4. Keep `key` unchanged.
5. Later: wire `getSiteMedia()` to read Supabase overrides (same keys) — structure is ready.

### C) Adding a new slot

1. Add file under `public/images/...`.
2. Add entry to `SITE_MEDIA` in `src/data/site-media.ts`.
3. Use `<SiteMediaImage mediaKey="..." />` (or `getSiteMedia`).
4. Seed Supabase so Table Editor stays complete.
5. Log license in `IMAGE-SOURCES.md`.

## Honesty labels

Gallery and many service visuals are **licensed inspiration**, not claimed Curtain Guy portfolio shots. UI captions say “Inspiration example” where appropriate. Replace with owner photography when available — keep the same keys.

## Rules

- No competitor / Drape Kings photos.
- Event draping context only (not residential curtains).
- Prefer `SiteMediaImage` / `getSiteMedia` — do not hardcode scattered paths in components.
