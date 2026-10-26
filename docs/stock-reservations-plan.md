# Date-based stock reservations — plan

Status: **plan only, nothing built yet.** Separate from the invoice ↔ inventory link (migration `20261026183234_tcg_invoice_line_inventory`), which this builds on.

## Problem

Stock today is a single number per product (`products.quantity_on_hand`, or `product_color_variants.quantity_on_hand` when a colour has its own pricing). Nothing records that 600 ft of navy velvet is out at Grand Quai from Nov 24 to Nov 26, so:

- The inventory picker says "Available · Qty 10000" no matter what is already booked that week.
- Two jobs on the same weekend can both promise the same drapes without a warning.
- There is no pull list per job and no "what's going out Friday" view.

## What we already have

| Piece | Where |
| --- | --- |
| Product + optional colour stock | `products.quantity_on_hand`, `product_color_variants.quantity_on_hand` |
| Packages made of components | `product_package_components (package_product_id, component_product_id, quantity)` |
| Quote lines linked to products | `quote_line_items.product_id` |
| Invoice lines linked to products and to their quote line | `invoice_line_items.product_id`, `source_quote_line_id` |
| Job dates | `event_jobs.install_date`, `event_date`, `teardown_date` (+ start/end times) and `status` |

Gaps: lines store `product_id` but **not the colour variant**, and the job has no "stock out / stock back" dates beyond install and teardown.

## Design

### 1. Data model (one migration, `tcg_stock_reservations`)

```sql
-- on quote_line_items and invoice_line_items
color_variant_id uuid references product_color_variants on delete set null

create table stock_reservations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references event_jobs on delete cascade,
  product_id uuid not null references products on delete restrict,
  color_variant_id uuid references product_color_variants on delete set null,
  quantity numeric not null check (quantity > 0),
  starts_on date not null,          -- leaves the warehouse (install_date, else event_date)
  ends_on date not null,            -- back and available (teardown_date, else event_date) + buffer
  status text not null default 'hold'
    check (status in ('hold','confirmed','out','returned','released')),
  source text not null check (source in ('quote_line','invoice_line','manual','package_component')),
  source_line_id uuid,              -- quote/invoice line it came from
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (ends_on >= starts_on)
);
create index on stock_reservations (product_id, starts_on, ends_on);
create index on stock_reservations (job_id);
```

Stock key = `(product_id, color_variant_id)`. When a colour has `has_own_pricing` + its own `quantity_on_hand`, it's tracked separately; otherwise the colour shares the product pool (same rule the picker uses in `colorStock()`).

Packages: reserving a package explodes into one `package_component` row per component (quantity × component quantity), so pipe, bases and drapes are counted where they actually live.

Services (`kind = 'service'`, delivery, installation) are never reserved.

### 2. Availability function

`stock_available(product_id, color_variant_id, from date, to date) returns integer` (SQL, `security definer`, owner-only via RPC):

- on hand − max over each day in the range of the sum of active reservations (`hold`, `confirmed`, `out`) that overlap that day.
- Uses the peak day, not the sum over the range, so back-to-back jobs don't double count.

A config value `stock_turnaround_days` (default 1) pads `ends_on` for cleaning/steaming before the next booking.

### 3. When reservations are created / change

| Event | Effect |
| --- | --- |
| Quote accepted → job created | `hold` rows from priced, product-linked quote lines using job dates |
| Job confirmed (deposit paid or status `confirmed`) | `hold` → `confirmed` |
| Job dates edited | `starts_on` / `ends_on` re-derived on every non-`returned` row |
| Invoice lines edited (job invoice) | re-sync: lines with `product_id` are the source of truth once an invoice exists |
| Install done (`installed`) | → `out` |
| Teardown completed | → `returned` |
| Job cancelled / quote declined / invoice voided | → `released` |

Sync lives in one server function, `syncJobReservations(jobId)`, called from the existing job / quote / invoice save paths (`src/lib/jobs.ts`, `src/lib/quotes.ts`, `src/lib/invoices.ts`). It diffs by `(product_id, color_variant_id)` so manual rows and `out`/`returned` rows are never overwritten.

Direct invoices (no job) don't reserve unless they get an event date — then use `event_date` for both ends.

### 4. UI

- **Inventory picker** (quotes + invoices): when the document has dates, each card shows "12 of 20 free Nov 24–26" instead of the raw on-hand number, and an amber "Short by 4" badge when the requested quantity exceeds free stock. Never blocks — owner can overbook knowingly.
- **Line rows**: small availability dot next to the "Inventory item" chip (green / amber / red) with a tooltip listing conflicting jobs.
- **Job page**: "Pull list" card — every reserved item with photo, colour, quantity, status chip; buttons for "Mark out" / "Mark returned". Printable.
- **Inventory admin**: per-product "Calendar" tab — 6-week strip showing booked vs on hand per day, click a day to see which jobs.
- **Dashboard**: "Going out this week" and "Conflicts" tiles.

### 5. Phases

1. **Colour on lines** — add `color_variant_id` to quote/invoice lines; picker and quote→invoice copy carry it. Small, unblocks everything else.
2. **Reservations core** — table, `stock_available`, `syncJobReservations`, backfill from active jobs (`status not in ('closed','cancelled')` with dates).
3. **Picker availability** — date-aware counts + shortage badges.
4. **Job pull list** — out / returned workflow.
5. **Calendar + dashboard tiles.**

Each phase ships on its own; phase 1–3 is the useful minimum.

## Open questions for the owner

- Turnaround buffer: 1 day enough, or per category (e.g. drapes need steaming = 2 days)?
- Should a `hold` (quote sent, not accepted) count against stock, or only accepted jobs? Proposal: holds count but show as "soft" (amber) in the picker.
- Overbooking: warn only (proposed) or hard-block for confirmed jobs?
- Are any items consumable (not returned) — e.g. tape, ties — that should decrement on-hand instead of reserving?
