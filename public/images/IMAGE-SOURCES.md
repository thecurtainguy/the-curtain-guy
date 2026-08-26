# Image Sources — The Curtain Guy

See also: [`docs/site-media.md`](../../docs/site-media.md) for slot keys and how to replace images.

## Rules

- Do **not** use competitor photos.
- Do **not** use Drape Kings photos.
- Only use: owner-supplied photos, licensed stock, photographer-approved event photos, supplier-approved images with permission.
- Record source, license/permission, date added, file path, and alt text for every file.
- Slot keys live in `src/data/site-media.ts` and Supabase `site_image_slots`.

## Tracking table (new assets)

| file path | source | license/permission | date added | alt text | notes |
|-----------|--------|--------------------|------------|----------|-------|
| `services/wedding-hero.jpg` | Unsplash `photo-1690332536800-92ec96b53184` | Unsplash License | 2026-08-24 | Outdoor wedding ceremony with white drapes | Slot `services.wedding-draping.hero` |
| `services/wedding-aside.jpg` | same | Unsplash License | 2026-08-24 | Wedding draping ceremony fabric | Slot `services.wedding-draping.aside` |
| `gallery/wedding/03.jpg` | Unsplash `photo-1745573673583-a51f665ae48e` | Unsplash License | 2026-08-24 | Wedding stage florals and drapery | Slot `gallery.wedding.3` |
| `gallery/wedding/04.jpg` | Unsplash `photo-1464366400600-7168b8af9bc3` | Unsplash License | 2026-08-24 | Reception tables décor | Slot `gallery.wedding.4` |
| `services/wedding-detail.jpg` | Unsplash `photo-1511795409834-ef04bbd61622` | Unsplash License | 2026-08-24 | Wedding reception ambiance | Slot `services.wedding-draping.detail` |
| `services/pipe-detail.jpg` | Unsplash `photo-1529636798458-92182e662485` | Unsplash License | 2026-08-24 | Aisle / venue structure | Slot `services.pipe-and-drape-rental.detail` |
| `services/corporate-detail.jpg` | Unsplash `photo-1492684223066-81342ee5ff30` | Unsplash License | 2026-08-24 | Conference / event atmosphere | Slot `services.corporate-event-draping.detail` |
| `services/stage-detail.jpg` | Unsplash `photo-1505373877841-8d25f7d46678` | Unsplash License | 2026-08-24 | Presentation stage setting | Slot `services.stage-backdrop-rentals.detail` |
| `gallery/corporate/04.jpg` | Unsplash `photo-1540575467063-178a50c2df87` | Unsplash License | 2026-08-24 | Conference atmosphere | Slot `gallery.corporate.3` |
| `gallery/mitzvah/04.jpg` | Unsplash `photo-1530103862676-de8c9debad1d` | Unsplash License | 2026-08-24 | Celebration décor | Slot `gallery.mitzvah.3` |
| `gallery/stage/04.jpg` | Unsplash `photo-1503095396549-807759245b35` | Unsplash License | 2026-08-24 | Stage / theater atmosphere | Supporting stage variety |
| `gallery/blackout/03.jpg` | Unsplash `photo-1558618666-fcd25c85cd64` | Unsplash License | 2026-08-24 | Dark textile folds | Slot `gallery.blackout.3` |
| `home/how-it-works.jpg` | Unsplash `photo-1464366400600-7168b8af9bc3` | Unsplash License | 2026-08-24 | Event tables atmosphere | Slot `home.how_it_works.visual` |
| `event-builder/*.jpg` | See `event-builder/README.md` | Mixed gallery/services copies | 2026-08-26 | Event Builder catalog cards | Swap files in folder; alts in `catalog-images.ts` |
| `areas/montreal-hero-alt.jpg` | Unsplash `photo-1519167758481-83f550bb49b3` | Unsplash License | 2026-08-24 | Ballroom atmosphere | Optional alt |

## Phase 1 assets (reorganized into slot paths)

Older Unsplash/Pexels files under `gallery/`, `hero/`, `services/`, `about/`, `ai/` were copied into the new `home/`, `services/`, `areas/`, `gallery/{category}/` layout. Originals remain for reference. See Phase 1 table in git history if needed.

Key Phase 1 sources still in use via copies:

| Original | Platform | License |
|----------|----------|---------|
| Ballroom `2OrQ-JPCc08` | Unsplash | Unsplash License |
| Stage curtains `wsWF9M6NXwk` | Unsplash | Unsplash License |
| Wedding candles/drapes | Pexels | Pexels License |
| Theater seats | Pexels | Pexels License |
| Black fabric texture | Pexels | Pexels License |
| Photo backdrop floral | Pexels | Pexels License |
| Celebration stage | Unsplash | Unsplash License |

## Brand logo

| file path | source | license/permission | date added | alt text | notes |
|-----------|--------|--------------------|------------|----------|-------|
| `brand/logo-full.jpg` | Owner-supplied brand lockup | Owner IP | 2026-08-24 | The Curtain Guy — Event Draping & Rentals | Used in header, footer, login screens, icons, OG |

## Notes

- Gallery UI labels imagery as **Inspiration example**.
- Prefer replacing via stable slot keys rather than editing component files.
- Supabase table `site_image_slots` mirrors every key in `src/data/site-media.ts`.
