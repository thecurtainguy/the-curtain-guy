# Event Builder catalog images

Each setup card in `/studio/build` (Step 2) uses **one file in this folder**. Replace a file to update that card — no code changes needed.

Slot definitions and alt text live in `src/data/event-builder/catalog-images.ts`.

| File | Catalog setup | Current source (gallery) |
|------|----------------|---------------------------|
| `backdrop-full.jpg` | Full pleated backdrop | `services/wedding-draping-service-01.jpg` |
| `backdrop-head-table.jpg` | Head / sweetheart table backdrop | `gallery/wedding/03.jpg` |
| `backdrop-stage.jpg` | Stage / DJ backdrop | `services/stage-backdrop-rental-01.jpg` |
| `entrance-door-drape.jpg` | Door entrance drape | `gallery/mitzvah/01.jpg` |
| `entrance-tunnel.jpg` | Draped doorway tunnel | `gallery/pipe-and-drape/01.jpg` |
| `ceremony-chuppah.jpg` | Ceremony arch / chuppah | `services/wedding-hero.jpg` |
| `perimeter-full.jpg` | Full room perimeter drape | `gallery/event-room-transformation-draping-01.jpg` |
| `perimeter-partial.jpg` | Partial wall softening | `services/corporate-hero.jpg` |
| `room-divider.jpg` | Room divider | `gallery/pipe-and-drape/02.jpg` |
| `top-swag.jpg` | Top swag / valance | `gallery/wedding/02.jpg` |
| `addon-star-drape.jpg` | Star drape look | `gallery/celebration-draping-backdrop-01.jpg` |
| `addon-blackout.jpg` | Blackout masking | `gallery/black-velvet-drape-texture-01.jpg` |
| `addon-uplighting.jpg` | Uplighting | `gallery/stage/01.jpg` |
| `coming-ceiling-drape.jpg` | Ceiling draping (coming soon) | `gallery/gala-ballroom-draping-01.jpg` |
| `coming-tent-wrap.jpg` | Tent / pavilion wrap (coming soon) | `services/pipe-hero.jpg` |
| `coming-infinity-entrance.jpg` | Infinity entrance (coming soon) | `gallery/pipe-and-drape/02.jpg` |
| `coming-floral-header.jpg` | Floral header (coming soon) | `gallery/wedding/03.jpg` |
| `coming-layered-swag.jpg` | Layered swag (coming soon) | `gallery/wedding/02.jpg` |

When you swap a photo, update `public/images/IMAGE-SOURCES.md` and the `alt` field in `catalog-images.ts`.
