# Agent Spec: `next-intl` for The Curtain Guy (`en` + Quebec French)

> **Status:** Approved by owner — ready for implementation  
> **Library:** [`next-intl`](https://next-intl.dev/)  
> **Do not start until assigned.** Do not commit unless the user explicitly asks.

---

## Mission

Add bilingual support to the **public marketing site** using **`next-intl`**, with:

| Locale ID | Language | URL behavior |
|---|---|---|
| `en` | English (default) | Keep current URLs (`/services`, `/get-estimate`, …) |
| `fr` | **French (Canada / Quebec register)** | Prefix only for French (`/fr/services`, `/fr/get-estimate`, …) |

**Do not translate admin/account portals in this project.** They stay English-only at `/admin/**` and `/account/**`.

---

## Why `next-intl` (recommendation confirmed)

This project runs **Next.js 16 App Router**, **React 19**, and deploys on **Vercel**, with a marketing site plus account/admin portals. That is exactly the stack `next-intl` is built for.

**Why it fits The Curtain Guy:**

- **App Router native** — locale segments like `/fr/services`, server components, metadata per language (good for Montreal SEO)
- **Works with existing middleware** — auth/session middleware can live alongside locale routing (needs careful ordering, but it is a solved pattern)
- **Strong for marketing copy** — JSON/message files for hero, services, estimate flow, FAQ, etc.
- **`fr-CA` support** — first-class locale codes; English as `en` or `en-CA`
- **Active and widely used** — better long-term bet than older `next-i18next` (Pages Router era)

**What to expect (so you are not surprised):**

- It is a **real refactor**, not a quick plugin — routes, links, metadata, and a lot of strings move into translation files
- **Portals** (admin/account) are often kept **English-only at first**; public site gets `en` + `fr` first — that is the smart phased approach
- **Quebec French** = locale `fr` with `fr-CA` register in copy; customer-facing strings should be reviewed by a human (especially event/drape terminology), not machine-default European French

**Alternatives to skip:**

| Option | Why not first choice |
|---|---|
| `next-i18next` | Pages Router–oriented; awkward with App Router |
| Raw `i18next` only | More wiring you would rebuild yourself |
| CMS-only (no i18n lib) | Overkill for a site this structured |

**Bottom line:** For `en` + Quebec French (`fr`), Vercel, App Router, and SEO in Montreal — **`next-intl` is the right call.**

---

## Project context (read first)

- **Repo:** `/home/aron/dev/the-curtain-guy`
- **Stack:** Next.js **16.3.2**, React **19**, App Router, Tailwind 4, Supabase auth, Vercel deploy
- **Package manager:** `pnpm`
- **Brand:** Luxury event drape rental — Montreal / Quebec. UI must stay premium (see `.cursor/rules/visual-first-ui.mdc`)
- **Supabase:** Only project `xszhnecwhjcywhqjzfit` — do not touch other projects (see `.cursor/rules/supabase-curtain-guy-only.mdc`)
- **Current middleware:** `middleware.ts` runs Supabase session refresh via `@/lib/supabase/middleware`
- **Current copy lives in:** `src/data/site.ts`, `services.ts`, `areas.ts`, `faq.ts`, `estimate.ts`, `gallery.ts`, `reviews.ts`, plus pages and components
- **SEO today:** `src/lib/seo.ts`, `sitemap.ts`, `robots.ts`, JSON-LD in `layout.tsx` (`inLanguage: "en-CA"`)
- **Recent mobile UX (do not regress):** fixed mobile header, back-to-top on inner scroll containers, estimate step auto-scroll on mobile, portal mobile bar — all on `main` as of commit `beab96d`

### Key files to read before coding

| File | Why |
|---|---|
| `middleware.ts` | Supabase session — must compose with next-intl |
| `src/lib/supabase/middleware.ts` | Session refresh implementation |
| `src/components/layout/site-shell.tsx` | Pathname-based shell switching (marketing vs portal) |
| `src/components/layout/header.tsx` | Nav links, mobile menu, language switcher goes here |
| `src/components/ui/guarded-link.tsx` | Estimate unsaved-changes guard — must stay locale-aware |
| `src/lib/seo.ts` | Metadata, JSON-LD, canonical helpers |
| `src/app/sitemap.ts` | Must emit both locales |
| `src/app/layout.tsx` | Root fonts, theme, providers |
| `src/app/template.tsx` | PageTransition wrapper |
| `next.config.ts` | Plugin wiring |
| `AGENTS.md` | Next.js 16 API differences — read `node_modules/next/dist/docs/` before writing code |

### Current public routes (41 pages — Phase 1 subset below)

```
src/app/page.tsx
src/app/about/page.tsx
src/app/services/page.tsx
src/app/services/[slug]/page.tsx
src/app/areas/[slug]/page.tsx
src/app/gallery/page.tsx
src/app/reviews/page.tsx
src/app/contact/page.tsx
src/app/faq/page.tsx
src/app/get-estimate/page.tsx
src/app/privacy/page.tsx
src/app/ai/page.tsx
src/app/studio/page.tsx
src/app/studio/new/page.tsx
src/app/studio/[id]/page.tsx
src/app/studio/saved/page.tsx
src/app/quote/[token]/page.tsx
src/app/admin/**        ← out of scope
src/app/account/**      ← out of scope
```

---

## Locked architecture decisions

These are **not optional** — follow exactly unless blocked:

1. **Library:** `next-intl` (not `next-i18next`, not raw i18next alone)
2. **Routing:** App Router **`[locale]` segment** for public pages only
3. **Locale prefix:** `localePrefix: 'as-needed'`
   - English stays unprefixed (preserves existing SEO/indexed URLs)
   - French uses `/fr/...`
4. **Locale codes in routing:** `locales: ['en', 'fr']`, `defaultLocale: 'en'`
5. **French register:** `fr` messages must be **Canadian / Quebec French** (formal event-industry tone), **not** European French
6. **URL slugs (Phase 1):** Keep **English slugs** for both locales
   - ✅ `/fr/services/wedding-draping`
   - ❌ Do not translate slugs to `/fr/services/draperie-mariage` yet
7. **Portals/API/auth:** **No locale prefix**, no translation work
8. **Phased delivery:** Public marketing first; portals explicitly out of scope

### Locale naming reference

| Concept | Value |
|---|---|
| Routing locale IDs | `en`, `fr` |
| OpenGraph locale | `en_CA`, `fr_CA` |
| hreflang | `en`, `fr-CA` |
| HTML `lang` attribute | `en`, `fr` |
| Quebec French content | Written in `messages/fr/*.json` using Canadian register |

There is no separate standard BCP 47 code for “Quebec only” — **`fr-CA` is the correct semantic** for hreflang/metadata even when the routing segment is `/fr`.

---

## Target folder structure (end state)

```
messages/
  en/
    common.json
    nav.json
    home.json
    services.json
    areas.json
    faq.json
    estimate.json
    contact.json
    gallery.json
    reviews.json
    privacy.json
    metadata.json
  fr/
    (same files — Quebec French)

src/i18n/
  routing.ts       # defineRouting(...)
  request.ts       # getRequestConfig(...)
  navigation.ts    # createNavigation(...) → Link, redirect, useRouter, usePathname, getPathname

src/app/
  layout.tsx                    # root: fonts, theme shell pieces that apply globally
  template.tsx                  # PageTransition (keep working)
  [locale]/
    layout.tsx                  # NextIntlClientProvider, SiteShell, generateStaticParams
    page.tsx                    # home
    about/page.tsx
    services/page.tsx
    services/[slug]/page.tsx
    areas/[slug]/page.tsx
    gallery/page.tsx
    reviews/page.tsx
    contact/page.tsx
    faq/page.tsx
    get-estimate/page.tsx
    privacy/page.tsx
    ai/page.tsx                 # Phase 2 if time; else leave English-only at /ai
  admin/**                      # unchanged, English-only
  account/**                    # unchanged, English-only
  api/**                        # unchanged
  auth/**                       # unchanged
  quote/[token]/**              # Phase 2 optional; English-only OK initially
  studio/**                     # Phase 2 optional; can stay English-only initially
  sitemap.ts                    # update for both locales
  robots.ts                     # unchanged rules
```

---

## Phase plan

### Phase 0 — Setup (must complete first)

1. Install: `pnpm add next-intl`
2. Wrap `next.config.ts` with `createNextIntlPlugin()` from `next-intl/plugin`:

   ```ts
   import type { NextConfig } from "next";
   import createNextIntlPlugin from "next-intl/plugin";

   const withNextIntl = createNextIntlPlugin();
   const nextConfig: NextConfig = { /* existing config */ };
   export default withNextIntl(nextConfig);
   ```

3. Create `src/i18n/routing.ts`:

   ```ts
   import { defineRouting } from "next-intl/routing";

   export const routing = defineRouting({
     locales: ["en", "fr"],
     defaultLocale: "en",
     localePrefix: "as-needed",
   });
   ```

4. Create `src/i18n/request.ts` — load messages per locale (merge namespaces from `messages/{locale}/*.json`)
5. Create `src/i18n/navigation.ts`:

   ```ts
   import { createNavigation } from "next-intl/navigation";
   import { routing } from "./routing";

   export const { Link, redirect, usePathname, useRouter, getPathname } =
     createNavigation(routing);
   ```

6. **`generateStaticParams`** in `app/[locale]/layout.tsx`:

   ```ts
   import { routing } from "@/i18n/routing";

   export function generateStaticParams() {
     return routing.locales.map((locale) => ({ locale }));
   }
   ```

7. Set `<html lang={locale}>` correctly for `[locale]` routes (`en` / `fr`)
8. Prove routing with **home page only** before migrating everything

### Phase 1 — Public marketing (MVP / required)

Move and translate these routes:

| Route | Priority | Notes |
|---|---|---|
| `/` | P0 | Hero, trust strip, all homepage sections |
| `/services` + `/services/[slug]` | P0 | 6 service pages; large copy in `src/data/services.ts` |
| `/get-estimate` | P0 | Estimate builder is copy-heavy (`estimate.ts` + components) |
| `/contact` | P0 | Form labels + success states |
| `/about` | P1 | |
| `/gallery` | P1 | |
| `/faq` | P1 | FAQ schema must use translated Q&A |
| `/reviews` | P1 | Public showcase + share dialog strings |
| `/areas/[slug]` | P1 | Montreal-area SEO pages |
| `/privacy` | P2 | Legal copy — translate carefully |

**Header language switcher (required):**

- Desktop + mobile menu
- Labels: **EN** / **FR** (or “English” / “Français”)
- Uses `usePathname` + `useRouter` from `@/i18n/navigation`
- Preserves current path when switching (`/services` ↔ `/fr/services`)
- Match existing luxury UI (gold accent, compact pill/chip — not a plain `<select>`)

**Navigation migration (required for Phase 1 pages):**

- Replace `next/link` with `@/i18n/navigation` `Link` in **public/marketing** components
- Update `GuardedLink` to wrap i18n `Link` instead of `next/link` (estimate flow depends on this)
- Update `navLinks` usage in header/footer to read from translations, not hardcoded English in `site.ts`

### Phase 2 — Optional follow-up (only if Phase 1 is solid)

- `/studio/**`, `/ai`, `/quote/[token]`
- Deeper SEO: translated Open Graph per page, FAQ/service JSON-LD in both languages
- Translation management workflow / CMS hookup
- Optional French path aliases (e.g. `/fr/soumission` → `/fr/get-estimate`) via `pathnames` config — **out of scope for Phase 1**

### Explicitly out of scope

- `/admin/**`, `/account/**`, all portal sidebars, admin tables, quote builder backend UI
- Supabase schema changes for translations
- Machine-translate-and-ship without human-review markers for customer-facing French
- Translated URL slugs
- Commit/push unless user asks

---

## Middleware / Supabase composition (critical)

**Current file:** `middleware.ts` → `updateSession(request)` only.

**Required:** Compose **`next-intl` middleware + Supabase session refresh** without breaking auth cookies.

### Recommended approach

1. Create `intlMiddleware = createMiddleware(routing)` from `next-intl/middleware`
2. Run intl middleware first on matched public routes
3. Pass the resulting `NextResponse` into Supabase session logic
4. Refactor `@/lib/supabase/middleware` if needed to accept an existing response instead of always calling `NextResponse.next()` fresh

### Example composition pattern (adapt to actual code)

```ts
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  return updateSession(request, intlResponse);
}
```

You may need to refactor `updateSession` signature from:

```ts
export async function updateSession(request: NextRequest)
```

to:

```ts
export async function updateSession(
  request: NextRequest,
  response?: NextResponse
)
```

…so Supabase cookie writes apply to the intl redirect/rewrite response, not a fresh `NextResponse.next()`.

### Matcher

Matcher must continue excluding static assets and should **not break** `/admin`, `/account`, `/api`, `/auth`, `/quote`.

Current matcher (preserve intent):

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Consider aligning with next-intl recommended matcher while keeping static asset exclusions:

```ts
"/((?!api|_next|_vercel|.*\\..*).*)"
```

Test both approaches; priority is **no auth regression**.

### Next.js 16 note: `middleware.ts` vs `proxy.ts`

Next.js 16 docs mention renaming `middleware.ts` → `proxy.ts` and renaming the export from `middleware` to `proxy`. **This repo still uses `middleware.ts`.** Do not rename unless required for build — compose in existing `middleware.ts` first.

next-intl docs reference `proxy.ts` for Next.js 16.3+; verify against `node_modules/next/dist/docs/` if build fails.

### Verify after implementation

- [ ] `/admin` login still works
- [ ] `/account` session refresh works
- [ ] `/fr/services` loads French
- [ ] `/services` loads English without redirect loop
- [ ] `/fr/admin` does **not** exist / redirects correctly
- [ ] Auth cookies still set on portal navigation

---

## Translation strategy

### Do

- Move **user-facing strings** into `messages/{locale}/*.json`
- Keep **structural data** (slugs, icons, image paths, Lucide refs) in `src/data/*.ts`
- For services/areas/FAQ: use slug as key (`services.wedding-draping.title`, etc.)
- Use `getTranslations` / `useTranslations` in components
- Use `getTranslations({ locale, namespace })` in `generateMetadata`
- Mark strings needing human review with a `// TODO(fr-review):` comment in JSON or a `_meta.reviewNeeded` flag for long copy

### Do not

- Duplicate entire `services.ts` as two TS files
- Hardcode French strings inline in components
- Break existing English URLs
- Remove `siteConfig` phone/email/domain — those stay constant across locales

### Message file organization example

```json
// messages/en/services.json
{
  "wedding-draping": {
    "title": "Wedding Draping",
    "hubCardDescription": "Ceremony backdrops, reception room transformation...",
    "intro": "...",
    "metaTitle": "...",
    "metaDescription": "..."
  }
}
```

```json
// messages/fr/services.json
{
  "wedding-draping": {
    "title": "Draperie de mariage",
    "hubCardDescription": "...",
    "intro": "...",
    "metaTitle": "...",
    "metaDescription": "..."
  }
}
```

Data file keeps slug + icon + image:

```ts
// src/data/services.ts — structural only after migration
{ slug: "wedding-draping", icon: Layers, image: "...", relatedSlugs: [...] }
```

### Quebec French copy rules

- Use **Canadian spellings** and Montreal event vocabulary
  - e.g. “location de draperies d’événement”, “installation”, “démontage”, “salle”, “backdrop / toile de fond” where appropriate
- Avoid European-only phrasing (“shop”, “booking” calques)
- Keep brand name **The Curtain Guy** untranslated
- Phone `514-963-3193`, email `info@thecurtainguy.com`, domain unchanged
- `$` pricing references unchanged if any appear in copy

---

## SEO requirements (Phase 1 minimum)

Update `src/lib/seo.ts` and consumers:

### 1. `createPageMetadata`

Accept `locale` and set:

- `alternates.canonical` per locale URL
- `alternates.languages` hreflang: `en`, `fr-CA` (and `x-default` → English canonical)
- OpenGraph `locale`: `en_CA` / `fr_CA`

Example shape:

```ts
export function createPageMetadata({
  title,
  description,
  path = "",
  locale = "en",
}: {
  title: string;
  description: string;
  path?: string;
  locale?: "en" | "fr";
}): Metadata {
  const localizedPath =
    locale === "fr" ? `/fr${path === "/" ? "" : path}` : path;
  const url = `${baseUrl()}${localizedPath === "/" ? "" : localizedPath}`;
  const enUrl = `${baseUrl()}${path === "/" ? "" : path}`;
  const frUrl = `${baseUrl()}/fr${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: enUrl,
        "fr-CA": frUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      type: "website",
    },
  };
}
```

Adapt to actual helper patterns in the repo.

### 2. `sitemap.ts`

Emit URLs for **both** locales for all Phase 1 public pages:

- `${base}/services/wedding-draping`
- `${base}/fr/services/wedding-draping`
- etc.

Include static pages, all service slugs, all area slugs.

### 3. `buildSiteGraphJsonLd`

- WebSite `inLanguage`: `["en-CA", "fr-CA"]` or separate graph nodes per language
- Navigation URLs include `/fr/...` equivalents where nav items exist in French
- Organization node may remain language-neutral; WebSite node should reflect bilingual support

### 4. `robots.ts`

No change to disallow rules. French marketing pages remain indexable.

### 5. General

- Do **not** noindex French pages
- FAQ JSON-LD (`createFaqPageJsonLd`) must match visible on-page French FAQ content when locale is `fr`

---

## Component migration checklist

Replace links in these **public** areas (grep `from "next/link"`):

- `src/components/layout/header.tsx`
- `src/components/layout/footer.tsx` (if present)
- `src/components/layout/header-account-menu.tsx` (marketing links only)
- `src/components/ui/guarded-link.tsx`
- `src/components/sections/**`
- `src/components/marketing/**`
- `src/components/estimate/**`
- `src/components/page-hero.tsx`
- `src/components/contact/**`
- `src/app/[locale]/**` pages

**Keep `next/link`** inside admin/account/portal components:

- `src/components/portal/**`
- `src/components/admin/**`
- `src/components/account/**` (portal views)
- `src/app/admin/**`
- `src/app/account/**`

### `GuardedLink` migration note

Current implementation resolves href for unsaved-changes modal navigation. After migration:

- Import `Link` from `@/i18n/navigation` instead of `next/link`
- `resolveHref` must still produce a string the modal router can use
- Test: start estimate form, make dirty, click nav link in French locale — modal must appear and navigation must preserve locale

---

## Layout / provider wiring

Current root layout (`src/app/layout.tsx`) has:

- Google fonts (Geist, Inter, Playfair)
- `ThemeProvider`
- `UnsavedChangesProvider`
- `SiteShell`
- Google Analytics script
- JSON-LD script
- `viewport` export with `viewportFit: "cover"`

### Target structure

**Root layout (`src/app/layout.tsx`):**

- Shared `<html>` / `<body>`, fonts, global providers that apply to **all** routes
- May use default `lang="en"` for admin/account routes

**Locale layout (`src/app/[locale]/layout.tsx`):**

- `NextIntlClientProvider` with messages
- `setRequestLocale(locale)` if needed for static rendering (see next-intl docs for Next 16.3+ / `next/root-params`)
- `SiteShell` wraps marketing children
- Set `lang={locale}` on `<html>` — if nested html is invalid, use next-intl recommended pattern of moving html/body here and keeping root minimal

**Admin/account layouts:**

- Unchanged English shell
- No `NextIntlClientProvider` required if they do not call `useTranslations`

### `SiteShell` pathname checks

Current logic:

```ts
const isAppShell =
  pathname.startsWith("/admin") ||
  pathname.startsWith("/account") ||
  (pathname.startsWith("/studio/") && pathname !== "/studio");
```

After i18n, marketing pathnames become `/fr/services` etc. Portal paths stay `/admin`, `/account` — **no locale prefix**. Verify `SiteShell` still correctly:

- Shows marketing header/footer for `/fr/**`
- Delegates to portal shell for `/admin/**`, `/account/**`
- Does not double-wrap portal routes

May need:

```ts
const pathWithoutLocale = pathname.replace(/^\/fr(?=\/|$)/, "") || "/";
```

…or use next-intl `usePathname()` which returns pathname **without** locale prefix in client components.

### `PageTransition`

`src/app/template.tsx` wraps all routes with `PageTransition`. Ensure:

- Marketing pages still animate correctly in both locales
- Portal `h-svh` lock behavior unchanged (`page-transition.tsx` checks account/admin presets)
- Mobile blur-off behavior preserved

---

## Estimate form special instructions

High priority — do not break:

| Feature | File | Rule |
|---|---|---|
| Multi-step builder | `src/components/estimate/estimate-builder.tsx` | Translate strings only |
| Mobile step auto-scroll | `estimate-builder.tsx` | Preserve `useEffect` on `currentStep` — do not remove |
| Submit success confetti/curtain | `estimate-submit-success.tsx` | Translate strings only; do not change animation/scroll logic |
| Unsaved changes guard | `guarded-link.tsx` + `unsaved-changes-provider.tsx` | Must work in both locales |
| Validation messages | `src/data/estimate.ts` | Move to `messages/{locale}/estimate.json` |
| Honeypot / API payload | `/api/estimate` | No locale field required in Phase 1 |

French route: keep path **`/fr/get-estimate`** in Phase 1 (same slug). Optional alias `/fr/soumission` is **out of scope** unless trivial via `pathnames` config.

---

## Language switcher UX spec

- **Location:** header desktop (near theme toggle / account) + mobile sheet
- **Visual:** compact pill toggle or two-chip control matching gold luxury system (`primary` accent, rounded-2xl, not a native unstyled select)
- **Behavior:** switching locale preserves current path and query string
- **Accessibility:** `aria-current` on active language, visible focus ring, keyboard operable
- **Session:** must not cause full-page auth/session loss
- **Component suggestion:** `src/components/layout/language-switcher.tsx` — client component using `@/i18n/navigation`

Example interaction:

- User on `/services/wedding-draping` taps FR → navigates to `/fr/services/wedding-draping`
- User on `/fr/contact` taps EN → navigates to `/contact`

---

## Testing checklist (must pass before calling done)

### Build

- [ ] `pnpm build` succeeds with zero TypeScript errors
- [ ] `pnpm lint` passes (or no new lint errors introduced)

### Routing

- [ ] `/` English home
- [ ] `/fr` French home
- [ ] `/services/wedding-draping` English
- [ ] `/fr/services/wedding-draping` French
- [ ] `/get-estimate` English estimate form
- [ ] `/fr/get-estimate` French estimate form
- [ ] `/admin`, `/account/login` work with **no** `/fr` prefix forced
- [ ] No redirect loops on any Phase 1 route

### Auth

- [ ] Supabase session refresh still works on portal routes after middleware compose
- [ ] Sign in on `/account/login` → session persists navigating to `/account`
- [ ] Admin login at `/admin/login` unchanged

### UI

- [ ] Language switcher preserves path (test on services detail + estimate)
- [ ] Header/footer nav labels translated on French pages
- [ ] Estimate form works end-to-end in French (validation messages translated)
- [ ] Mobile header, back-to-top, estimate step scroll still work (recent mobile UX — do not regress)
- [ ] Visual-first UI maintained — no walls of untranslated plain text on French pages
- [ ] Share Experience dialog on `/fr/reviews` translated if reviews is Phase 1

### SEO

- [ ] `/sitemap.xml` includes French URLs for Phase 1 pages
- [ ] View page source: `<html lang="fr">` on French routes
- [ ] Canonical + hreflang present on a sample service page (view source or SEO inspector)
- [ ] FAQ page JSON-LD matches visible French content

### Quality

- [ ] No raw English paragraphs left on French Phase 1 pages (except proper nouns, emails, phone, brand name)
- [ ] No broken images/icons from translation refactor
- [ ] Lucide icons still render on service/area cards

---

## Definition of done

Phase 1 is complete when:

1. `next-intl` installed and configured
2. Public Phase 1 routes live under `[locale]` with working `en` + `fr`
3. Language switcher in header (desktop + mobile)
4. English URLs unchanged
5. French uses `/fr/...` with Quebec French copy in message files
6. SEO/sitemap/hreflang updated for Phase 1 pages
7. Admin/account untouched and functional
8. `pnpm build` passes
9. Agent provides a **translation coverage table** (what is done vs Phase 2 leftovers)

### Deliverable: translation coverage table (required in handoff)

| Area | English | French | Notes |
|---|---|---|---|
| Home | ✅/❌ | ✅/❌ | |
| Services hub + 6 slugs | | | |
| Get estimate | | | |
| Contact | | | |
| About | | | |
| Gallery | | | |
| FAQ | | | |
| Reviews | | | |
| Areas (all slugs) | | | |
| Privacy | | | |
| Studio / AI / Quote | Phase 2 | Phase 2 | |
| Admin / Account | N/A | N/A | English only by design |

---

## Risks / gotchas (agent must read)

1. **Middleware ordering** — easiest way to break login cookies; test `/account` immediately after wiring
2. **`SiteShell` pathname checks** — must handle `/fr/...` marketing paths without breaking portal detection
3. **`GuardedLink` + i18n** — must resolve locale-aware hrefs for unsaved modal navigation
4. **`src/data/*.ts` icons** — Lucide icons stay in TS; only strings move to JSON
5. **JSON-LD FAQ** — must match visible French FAQ content
6. **Next.js 16** — read `node_modules/next/dist/docs/` if APIs differ from training data (per `AGENTS.md`)
7. **Hydration** — language switcher and translated nav must not cause hydration mismatches; avoid `Date.now()` / random in rendered translation output
8. **`navLinks` in `site.ts`** — currently hardcoded English; either deprecate labels there or split into structural hrefs + translated labels from messages
9. **Do not commit** unless user explicitly asks
10. **Supabase MCP** — only use `supabase-thecurtainguy` / `project-0-the-curtain-guy-supabase-thecurtainguy`; project ref `xszhnecwhjcywhqjzfit`

---

## Suggested execution order for the agent

1. Read `middleware.ts`, `site-shell.tsx`, `header.tsx`, `seo.ts`, `sitemap.ts`, `layout.tsx`
2. Install `next-intl` + config + i18n files
3. Compose middleware + verify auth immediately
4. Create `[locale]/layout.tsx`, move **home page only** — prove routing works
5. Add language switcher to header
6. Migrate remaining Phase 1 routes one section at a time:
   - Services hub + slugs
   - Get estimate (largest form copy)
   - Contact
   - About, gallery, FAQ, reviews, areas, privacy
7. Update SEO/sitemap/hreflang/JSON-LD
8. Run full test checklist
9. Report translation coverage table + Phase 2 leftovers

---

## One-line prompt for a new agent

> Implement `next-intl` on The Curtain Guy per `docs/specs/i18n-next-intl.md`: `en` (unprefixed default) + `fr` (Quebec French, `/fr` prefix), Phase 1 public marketing only, compose with existing Supabase `middleware.ts`, preserve English URLs and recent mobile UX, add header language switcher, update SEO/sitemap/hreflang, do not translate admin/account portals, do not commit unless asked.

---

## Reference links

- next-intl App Router setup: https://next-intl.dev/docs/getting-started/app-router
- next-intl locale routing setup: https://next-intl.dev/docs/routing/setup
- next-intl middleware: https://next-intl.dev/docs/routing/middleware
