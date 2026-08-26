# Agent Spec: Studio Event Builder — Landing Intake + Pre-loaded Designer + Brief Submit

> **Status:** Approved by owner — ready for implementation  
> **Do not commit or push unless the user explicitly asks.**

---

## Mission

Build a **complete end-to-end “Build Your Event” flow** for The Curtain Guy that:

1. **Keeps** the existing `/studio` marketing hub (hero, photo, features) and adds a **primary CTA** that launches the new flow
2. **Adds** `/studio/build` — a **4-step guided intake + visual setup catalog** (separate route, full implementation)
3. **Pre-loads** the existing **2D/3D Studio** with room dimensions + selected drape setups
4. Lets users **refine in Studio** (same engine they paid to build)
5. Ends with a **minimal contact form + submit** — **NO pricing/checkout today**
6. Sends **confirmation to customer email** + **full summary to admin email** (Resend, same pattern as estimates)
7. Persists submission in Supabase for admin follow-up

**Get Estimate (**`/get-estimate`**) stays unchanged** — parallel fast path.

**Pricing:** Do **not** show final prices, cart, or Stripe. Optional soft copy: *“Planning brief — our team will follow up with a rental estimate.”* No dollar amounts unless owner adds rate cards later (out of scope).

---



## Non-negotiable blockers — READ BEFORE ANY CODE



### DO NOT MODIFY (Studio “guts and brains”)

These files are **production-critical**. The owner invested heavily in them. **Do not refactor, rewrite, or “clean up” them** as part of this project.


| Protected area          | Files (representative — treat entire dirs as frozen)                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2D editor core**      | `src/components/studio/studio-2d-editor.tsx`, `treatment-overlay-2d.tsx`, `drape-run-editor.tsx` (rendering/interaction logic)                     |
| **3D viewer core**      | `src/components/studio/studio-3d-viewer.tsx`, `src/components/studio/three/`** (walls, treatments, objects, scene)                                 |
| **Geometry engine**     | `src/lib/studio-geometry.ts` — **only add new exported helpers at bottom** if needed; do not change existing function behavior                     |
| **Treatment math**      | `src/lib/studio-treatments.ts` — **only add new preset keys/factory helpers**; do not change `createStudioTreatment` behavior for existing presets |
| **Design validation**   | `src/data/studio.ts` — `normalizeStudioDesign`, `validateStudioDesign`, payload limits                                                             |
| **Studio interactions** | `src/lib/studio-interactions.ts`                                                                                                                   |




### ALLOWED integration pattern

- **Wrap** `StudioDesigner` with new shell components via **props** (`mode`, `initialDesign`, callbacks)
- **Add** new files under `src/components/event-builder/`**, `src/data/event-builder/**`, `src/lib/event-builder/**`
- **Add** thin optional props to `StudioDesigner` / `StudioShell` / rails **only if** required for `mode="event"` — minimal diff, no behavior change when `mode="designer"` (default)
- **Call existing APIs:** `createStudioTreatment`, `createRectangleRoom`, `cloneStudioTemplate`, `calculateDrapeLength`, `calculateRoomAreaSquareFeet`



### Default mode must preserve today’s Studio

When `mode !== "event"` (or prop omitted), `/studio/new` and account/admin studio editors must behave **identically** to today. Run regression: open `/studio/new`, add drape, toggle 2D/3D, save (if logged in).

### Explicitly OUT OF SCOPE for this project (Studio engine upgrades)

Do **not** implement these inside Studio core — show as **“Coming soon”** in catalog only:

- Ceiling draping / tent / pavilion physics
- Door/window surround, layered swag, floral header, uplights (already stubbed in left rail)
- Cloth simulation, new Three.js materials overhaul
- AI floor-plan upload
- Drag-resize treatments on canvas (inspector-only stays as today)
- Live pricing engine / Stripe / cart checkout

Owner will improve Studio later to accommodate these ideas.

---



## Product story (user journey)

```
Nav: "Studio" → /studio (KEEP existing hub — add launch button)
        ↓
   [ Build your event ]  ← primary gold CTA on /studio
        ↓
┌─────────────────────────────────────────┐
│  /studio/build — 4-step flow            │
│  STEP 1 — Event & room                  │
│  STEP 2 — Visual setup catalog          │
│  STEP 3 — Look, fabric, add-ons         │
│  STEP 4 — Review brief → Open in Studio │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  /studio/new?mode=event                 │
│  Studio Event Mode (pre-loaded design)    │
│  2D/3D center · refine · live brief     │
│  → Submit event plan (minimal form)     │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  /studio/plan/success                   │
│  Confetti · emails · reference number   │
└─────────────────────────────────────────┘

Parallel paths from /studio hub:
  • Start drawing → /studio/new?mode=designer (advanced blank studio)
  • Rectangle / L-shape cards → /studio/new?template=… (unchanged)
  • Get estimate → /get-estimate (unchanged)
```

---

## Route map

| Route | Purpose |
|---|---|
| `/studio` | **KEEP** existing Studio hub — hero, features, room-shape cards. **Add** primary CTA → `/studio/build`. Do **not** replace with multi-step wizard. |
| `/studio/build` | **NEW** — full 4-step Event Builder (intake + catalog + look + review) |
| `/studio/new?mode=event` | Studio designer pre-loaded from brief (after step 4) |
| `/studio/new?mode=designer` | Advanced blank studio (today’s default “Start drawing” behavior) |
| `/studio/new` | Default: treat as `mode=designer` OR redirect to `?mode=designer` — must not break existing links |
| `/studio/new?template=rectangle\|l_shape\|custom` | Advanced designer with template (unchanged) |
| `/studio/saved` | Unchanged — saved designs |
| `/get-estimate` | Unchanged — quick estimate path |
| `/studio/plan/success` | Post-submit success |

**Do not** redirect `/studio` to `/studio/build` automatically. User chooses via button.

---

## Phase 0 — Studio hub updates (`/studio`) — KEEP + ENHANCE

**File:** `src/app/studio/page.tsx` — **do not delete** the current landing. **Surgical updates only.**

### What stays

- Hero headline, body copy, hero photo, “2D room plan → Generated 3D” callout
- Four feature tiles (Draw to scale, Place event draping, Preview in 3D, Save to account)
- Three room-shape cards (Rectangle, L-shape, Blank/custom) — links to `/studio/new?template=…`
- “AI design assistance is coming next” band (unchanged)

### What changes

**Hero CTA hierarchy (required):**

| Priority | Button | Link | Variant |
|---|---|---|---|
| **Primary** | **Build your event** | `/studio/build` | Gold `Button` size `lg` |
| Secondary | Start drawing | `/studio/new?mode=designer` | `outline` |
| Tertiary | View saved designs | `/studio/saved` | `outline` or ghost |
| Tertiary | Get estimate | `/get-estimate` | `ghost` |

**Optional one-line under primary CTA:**

*“Pick your room, choose setups like chuppah & entrance drapes, then preview in 3D.”*

**Featured card (required)** — insert **between hero and “Choose a starting point”**:

- Full-width luxury card: eyebrow “Recommended”, title **Build your event**
- Body: Room size → visual catalog → colors → Studio 3D preview → submit brief
- CTA button → `/studio/build`

**Rename section** “Choose a starting point” → **“Or open the advanced designer”** with subcopy: *For planners who want a blank canvas — pick a room shape and draw manually.*

Room-shape cards keep existing hrefs (`/studio/new?template=rectangle` etc.) — they skip the Event Builder.

### i18n note

If `next-intl` is active, new strings on `/studio` go in `messages/*/eventBuilder.json` or `studio.json` namespace — do not hardcode only in this pass if rest of site is translated.

---

## Phase 1 — Event Builder intake (`/studio/build`)

**New route:** `src/app/studio/build/page.tsx` — mounts the step orchestrator.

**New component:** `src/components/event-builder/event-builder-flow.tsx` — step state, progress header, back/next, persists `EventBuilderBrief` to `sessionStorage` on each step.

Follow `.cursor/rules/visual-first-ui.mdc` — cards, chips, photos, gold accents, no lonely paragraphs.

**Progress UI:** Top stepper — `Event & room` · `Setups` · `Look` · `Review` (4 steps). Mobile: compact step indicator + sticky “Your plan” summary.

### Step 1 — Event & room

**Collect:**


| Field          | Type                                                             | Required   |
| -------------- | ---------------------------------------------------------------- | ---------- |
| Event type     | Chip select — reuse IDs from `src/data/estimate.ts` `eventTypes` | Yes        |
| Room shape     | Rectangle · L-shape                                              | Yes        |
| Room width     | Feet (number)                                                    | Yes        |
| Room length    | Feet (number)                                                    | Yes        |
| Ceiling height | Feet (default 12)                                                | Yes        |
| L-shape cutout | W × D feet                                                       | If L-shape |
| Event date     | Date (optional)                                                  | No         |
| Venue / city   | Text (optional)                                                  | No         |


**UI:** Split panel — form left, inspirational photo + live “Room preview” stat card right (e.g. `2,400 ft² · 14′ ceiling`).

**Upsell copy (soft):** One line under event type — e.g. *“Weddings in this size often add a ceremony backdrop + entrance drape.”*

### Step 2 — Visual setup catalog

**Layout:** Category tabs (ShipOur-inspired, luxury styled):

1. **Backdrops & walls**
2. **Ceremony & entrances**
3. **Perimeter & dividers**
4. **Add-ons & upgrades**

**Interaction:** Photo cards with title + short description. Tap to toggle selected (gold check border). **Not add-to-cart.**

**Live sidebar / bottom sheet (mobile):** “Your event plan” — count of setups, chips list.

**Catalog items (v1 — map to existing Studio capabilities):**


| Catalog ID            | Customer label                   | Studio implementation                                                                                         |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `backdrop_full`       | Full pleated backdrop            | `createStudioTreatment(..., "full_backdrop")` on wall 0 (front)                                               |
| `backdrop_head_table` | Head / sweetheart table backdrop | `full_backdrop` on wall 2 or 3 (shorter span via preset placement helper)                                     |
| `backdrop_stage`      | Stage / DJ backdrop              | `full_backdrop` on selected wall                                                                              |
| `entrance_door_drape` | Door entrance drape              | `side_tiebacks` + auto `opening` type door on wall 0                                                          |
| `entrance_tunnel`     | Draped doorway tunnel            | `entrance_reveal` on wall 0                                                                                   |
| `ceremony_chuppah`    | Ceremony arch / chuppah          | `ceremony_arch` — center of room as object-adjacent or wall 0                                                 |
| `perimeter_full`      | Full room perimeter drape        | `drapeRun` type `wall_drape` on all walls                                                                     |
| `perimeter_partial`   | Partial wall softening           | `partial_drape` on 2 walls                                                                                    |
| `room_divider`        | Room divider                     | `drapeRun` type `room_divider`                                                                                |
| `top_swag`            | Top swag / valance               | `top_swag` treatment                                                                                          |
| `addon_star_drape`    | Star drape look                  | Brief flag only (fabric note) — 3D uses existing fabric enum if `star` exists in drape types else notes field |
| `addon_blackout`      | Blackout masking                 | Brief flag + default fabric `blackout` on next backdrop                                                       |
| `addon_uplighting`    | Uplighting                       | Brief flag only — catalog card **“Consult required”** badge                                                   |


**Coming soon cards (disabled, with badge):** Ceiling drape, tent/pavilion wrap, infinity entrance 3-section, floral header, layered swag.

**Bundle suggestions (upsell, optional chips):** “Popular for weddings” = chuppah + entrance_tunnel + backdrop_full — one tap selects all three.

### Step 3 — Look & add-ons


| Field              | UI                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------- |
| Fabric direction   | Chips from estimate `fabricDirections` (visual)                                    |
| Primary color      | Swatches: ivory, white, champagne, black, navy, etc. — maps to Studio `DrapeColor` |
| Fullness           | Standard · Full · Extra (maps to 2 / 2.5 / 3)                                      |
| Additional add-ons | Multi chips from estimate `addOnOptions` where relevant                            |


**No prices.**

### Step 4 — Review & launch

**Summary card:**

- Event type, date, venue
- Room dimensions + floor area
- Selected setups (list with icons)
- Fabric / color
- Estimated **linear drape** (calculated from preview design — see `buildStarterDesign`)
- Disclaimer: *“Planning brief only — not final pricing. We confirm after venue review.”*

**CTAs:**

1. **Primary:** “Open in Studio & preview in 3D” → `/studio/new?mode=event`
2. **Secondary:** “Submit plan without editing” → skip to submit form (still generates design server-side or client-side for email attachment)
3. **Tertiary:** “Advanced blank studio” → `/studio/new?mode=designer`
4. **Link:** “Prefer a quick form? Get estimate” → `/get-estimate`



### Brief state persistence

Use `sessionStorage` key `tcg-event-builder-brief-v1` (JSON) + optional `localStorage` backup for refresh.

Shape:

```ts
type EventBuilderBrief = {
  version: 1;
  eventType: string;
  room: {
    shape: "rectangle" | "l_shape";
    widthFt: number;
    lengthFt: number;
    wallHeightFt: number;
    cutoutWidthFt?: number;
    cutoutDepthFt?: number;
  };
  catalogSelections: string[]; // catalog IDs
  look: {
    fabricDirections: string[];
    primaryColor: DrapeColor;
    fullness: number;
  };
  addOns: string[];
  eventDate?: string;
  venueName?: string;
  cityArea?: string;
};
```

---



## Phase 2 — Starter design factory

**New file:** `src/lib/event-builder/build-starter-design.ts`

```ts
export function buildStarterDesignFromBrief(
  brief: EventBuilderBrief
): StudioDesignJson;
```

**Rules:**

1. Start from `cloneStudioTemplate(brief.room.shape === "l_shape" ? "l_shape" : "rectangle")`
2. Set room floor polygon via `createRectangleRoom` / `createLShapeRoom` with `feetToInches`
3. Set `room.wallHeight` from brief
4. For each `catalogSelections` ID, call a **catalog registry** entry that:
  - Invokes `createStudioTreatment` and/or pushes to `drapeRuns` / `openings`
  - Uses deterministic wall indices (document in registry): e.g. wall 0 = front, 1 = right, 2 = back, 3 = left
5. Apply `look.primaryColor`, `fullness`, fabric to all new runs/treatments
6. Return `normalizeStudioDesign(result)`

**New file:** `src/data/event-builder/catalog.ts` — catalog metadata (id, label, description, category, image path, `apply(design, brief): StudioDesignJson` or preset key + wall strategy).

**Do not duplicate treatment rendering logic** — only orchestrate existing factories.

---



## Phase 3 — Studio Event Mode (wrapper only)

**New route or query:** `/studio/new?mode=event`

**New component:** `src/components/event-builder/event-builder-page.tsx`

On mount:

1. Read `EventBuilderBrief` from `sessionStorage`
2. If missing → redirect to **`/studio/build`** (step 1) with toast — **not** `/studio`
3. `buildStarterDesignFromBrief(brief)` → pass as `initialDesign` to `StudioDesigner`

**New prop on** `StudioDesigner`**:**

```ts
mode?: "designer" | "event"; // default "designer"
eventBrief?: EventBuilderBrief;
onSubmitEventPlan?: () => void;
```



### Event mode UI changes (wrapper / rails only)


| Area          | Designer mode (default)   | Event mode                                                                                                                        |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Toolbar title | Editable design title     | “Your event plan” + event type chip                                                                                               |
| Left rail     | `StudioLeftRail` (today)  | `EventPresetLibrary` — visual photo cards; each click calls same `addTreatment` / drape helpers                                   |
| Right rail    | Properties inspector      | `EventBriefPanel` — stats + selected setups + **“Submit event plan”** CTA; selecting item still opens inspector below or in sheet |
| Mobile        | Tools / Properties sheets | Same pattern, event copy                                                                                                          |


`EventBriefPanel` **shows:**

- Floor area (existing calc)
- Total linear drape (existing `calculateDrapeLength`)
- Treatment count + list labels
- Fabric / color summary from brief
- Selected add-ons (chips)
- Disclaimer (no pricing)
- **Submit event plan** button (primary gold)

**Power users:** Link “Show all design tools” toggles full `StudioLeftRail` without leaving event mode.

### Handoff regression

- `/studio/new` without query → unchanged
- `/studio/new?mode=designer` → unchanged
- Account/admin studio routes → **never** pass `mode=event`

---



## Phase 4 — Submit flow (NO PRICING)



### Submit modal / page

**Trigger:** “Submit event plan” from Event Brief panel (or `/studio/build` step 4 secondary CTA “Submit plan without editing”).

**Minimal form:**


| Field     | Required     |
| --------- | ------------ |
| Full name | Yes          |
| Email     | Yes          |
| Phone     | Recommended  |
| Notes     | No           |
| Honeypot  | Yes (hidden) |


Pre-fill from account session if logged in.

**Do not ask** for full estimate wizard fields again — brief + design JSON carry the detail.

### API

**New route:** `POST /api/event-plan/submit`

**Payload:**

```ts
{
  contact: { name, email, phone?, notes? };
  brief: EventBuilderBrief;
  design: StudioDesignJson; // normalized, validated
  website?: string; // honeypot
}
```

**Server actions:**

1. Validate with Zod (mirror estimate patterns)
2. Run `validateStudioDesign(design)`
3. Insert DB row (see migration below)
4. Optionally save `studio_designs` row if user authenticated (link `event_plan_submission_id` or store design inline)
5. Send emails via Resend (new functions in `src/lib/email.ts`)
6. Return `{ ok: true, reference: "EP-…" }`



### Database migration

**New table:** `public.event_plan_submissions`


| Column                                        | Type                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------- |
| id                                            | uuid PK                                                               |
| reference                                     | text unique (generated, e.g. EP-20260826-XXXX)                        |
| contact_name, contact_email, contact_phone    | text                                                                  |
| event_type, event_date, venue_name, city_area | text / date                                                           |
| brief_json                                    | jsonb                                                                 |
| design_json                                   | jsonb (snapshot at submit)                                            |
| owner_user_id                                 | uuid nullable FK auth.users                                           |
| studio_design_id                              | uuid nullable FK studio_designs                                       |
| status                                        | text default `new` check in (`new`, `reviewed`, `quoted`, `archived`) |
| created_at, updated_at                        | timestamptz                                                           |


Apply via Supabase MCP `supabase-thecurtainguy` only — project `xszhnecwhjcywhqjzfit`.

**Admin UI:** Minimum for v1 — admin notification email with full summary + link to `/admin/event-plans/[id]` **if time allows**. If not, email-only is acceptable for v1 but spec prefers a simple admin list page (see Definition of Done).

### Email content

**Pattern:** Copy structure from `sendEstimateNotificationEmail` / `sendEstimateCustomerConfirmationEmail` in `src/lib/email.ts`.

**Customer email:**

- Subject: `We received your event drape plan — {reference}`
- Reference, thank you, what happens next (24–48h review)
- **HTML summary sections:** Event, Room, Selected setups, Linear drape total, Fabric/color, Add-ons, Notes
- **No pricing**
- CTA: link to site / account if logged in

**Admin email:**

- To: `getEstimateNotifyTo()` or new `getEventPlanNotifyTo()` env (default same as estimate)
- Full summary + contact info + formatted design stats
- Optional: embed thumbnail if `thumbnail_data_url` captured client-side (stretch — skip if hard)

**Env vars (document in code comments only, not committed secrets):**

- Reuse `RESEND_API_KEY`, `TCG_ESTIMATE_FROM`
- `TCG_EVENT_PLAN_NOTIFY_TO` optional override

---



## Phase 5 — Success experience

**New component:** `EventPlanSubmitSuccess` — mirror estimate success luxury UI:

- `CelebrationConfetti` + `CurtainReveal` (reuse — do not rewrite)
- Reference number
- “What happens next” steps (review → quote conversation → booking)
- **No pricing**
- CTAs: Return home · Build another event · Get estimate (optional)

Scroll into view on submit (same pattern as `estimate-submit-success.tsx`).

---



## Visual & UX requirements

- **Luxury card system** — dark bg, gold accents, `font-heading`, rounded-2xl/4xl
- **Photography** — use `src/data/site.ts` `imagePaths`, services/gallery assets for catalog cards; add placeholder images under `/public/images/event-builder/` if needed
- **Mobile:** `/studio/build` steps stack; catalog grid 1–2 cols; sticky “Your plan” bottom bar; Studio event mode uses existing mobile sheets
- **Accessibility:** keyboard selectable cards, `aria-pressed` on catalog toggles, form labels
- **i18n:** If `next-intl` is on main site, wrap **new user-facing strings** in messages namespace `eventBuilder` — English first; French can follow separately

---



## Navigation & marketing integration

- Header nav **“Studio”** → `/studio` (hub — unchanged destination)
- Hub primary CTA + featured card → `/studio/build`
- Homepage / services CTAs may add “Build your event” → **`/studio/build`** (optional small diff if owner approves)
- Footer unchanged unless already links to `/studio`

---



## File structure (new files)

```
src/
  app/
    studio/
      page.tsx                    # UPDATE — hub CTAs + featured card (keep existing layout)
      build/
        page.tsx                  # NEW — 4-step Event Builder flow
      new/page.tsx                # MINOR — pass mode from searchParams
      plan/
        success/page.tsx          # NEW — success state
    api/
      event-plan/
        submit/route.ts           # NEW
    admin/
      event-plans/
        page.tsx                  # NEW — list (required in DoD)
        [id]/page.tsx             # NEW — detail read-only
  components/
    event-builder/
      event-builder-flow.tsx      # Step orchestrator for /studio/build
      studio-hub-featured-card.tsx  # Optional — featured card for /studio
      event-step-event-room.tsx
      event-step-catalog.tsx
      event-step-look.tsx
      event-step-review.tsx
      event-preset-library.tsx    # Event mode left rail
      event-brief-panel.tsx       # Event mode right rail
      event-plan-submit-dialog.tsx
      event-plan-submit-success.tsx
      catalog-card.tsx
      live-plan-sidebar.tsx
  data/
    event-builder/
      catalog.ts                  # Catalog definitions + images
      brief.ts                    # Types + sessionStorage helpers
  lib/
    event-builder/
      build-starter-design.ts
      format-event-plan-summary.ts  # For emails + admin
      event-plan-server.ts          # Validation + DB insert
supabase/migrations/
  YYYYMMDDHHMMSS_tcg_event_plan_submissions.sql
public/images/event-builder/        # Catalog thumbnails (optional)
```

---



## Testing checklist



### Studio regression (MANDATORY)

- [ ] `/studio/new` blank rectangle — add drape, treatment, toggle 2D/3D, save
- [ ] `/studio/new?template=l_shape` works
- [ ] Account/admin studio edit existing saved design — no regressions
- [ ] No visual glitches in 3D treatments after your changes



### Studio hub regression

- [ ] `/studio` still shows hero, photo, feature grid, room-shape cards, AI band
- [ ] Primary **Build your event** → `/studio/build`
- [ ] **Start drawing** → `/studio/new?mode=designer` (blank studio, not event mode)
- [ ] Room-shape cards still open `/studio/new?template=…`

### Event Builder flow

- [ ] `/studio/build` steps 1→4 complete on mobile and desktop
- [ ] Catalog multi-select updates live plan sidebar
- [ ] “Open in Studio” pre-loads room size + selected setups in 2D and 3D
- [ ] Event mode submit opens form, validates email
- [ ] API returns reference; emails sent (or logged in dev if no Resend key)
- [ ] Success page shows reference + confetti
- [ ] Guest submit works without login
- [ ] Logged-in customer links submission to `owner_user_id`
- [ ] Honeypot blocks bots
- [ ] `pnpm build` passes



### Admin

- [ ] Admin list shows new submissions
- [ ] Admin detail shows brief + design summary

---



## Definition of done

1. **`/studio` hub preserved** with new primary CTA + featured card pointing to `/studio/build`
2. **Full `/studio/build` intake** (4 steps) with catalog, visuals, upsell bundles, review
3. `buildStarterDesignFromBrief` working for all **enabled** catalog IDs
4. Studio event mode wrapper with brief panel + submit CTA
5. **Zero breaking changes** to default Studio designer behavior
6. Submit API + DB migration + customer + admin emails
7. Success screen at `/studio/plan/success`
8. Admin list + detail pages (minimal, read-only)
9. **No pricing** anywhere in this flow
10. Get Estimate untouched
11. Agent delivers **coverage table** of catalog items (live vs coming soon)

---



## Suggested execution order

1. Read protected files list — acknowledge in PR description
2. `EventBuilderBrief` types + sessionStorage helpers
3. `catalog.ts` + `build-starter-design.ts` — manually verify starter designs in console
4. **`/studio/build`** — full 4-step flow UI
5. **`/studio` hub** — add primary CTA, featured card, reframe advanced section (small diff)
6. `/studio/new?mode=event` handoff + `EventBriefPanel` + `EventPresetLibrary`
7. Migration + API + emails
8. Submit dialog + success
9. Admin pages
10. Full regression + build

---



## One-line agent prompt

> Implement the Studio Event Builder per `docs/specs/studio-event-builder.md`: **keep `/studio` hub** and add primary **Build your event** CTA → **`/studio/build`** (full 4-step catalog flow); pre-load Studio via `buildStarterDesignFromBrief` at `/studio/new?mode=event`; event mode wrapper only (do NOT modify 2D/3D core); submit minimal form with customer + admin emails and Supabase persistence; no pricing; admin list/detail; preserve default Studio + Get Estimate; do not commit unless asked.

---



## Reference docs in repo

- `docs/studio-classic-treatment-mvp.md` — treatment architecture
- `src/lib/studio-treatments.ts` — preset factory
- `src/app/api/estimate/route.ts` — submit + email pattern
- `src/lib/email.ts` — Resend HTML patterns
- `.cursor/rules/visual-first-ui.mdc` — UI quality bar

