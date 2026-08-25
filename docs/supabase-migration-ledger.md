# Supabase migration ledger — The Curtain Guy

**Project ref:** `xszhnecwhjcywhqjzfit`  
**API URL:** `https://xszhnecwhjcywhqjzfit.supabase.co`  
**MCP:** `supabase-thecurtainguy` only (never the generic Supabase plugin / other projects)

## Current local migrations

| Version          | File |
|------------------|------|
| `20260824194600` | `supabase/migrations/20260824194600_tcg_estimate_requests.sql` |
| `20260825012700` | `supabase/migrations/20260825012700_tcg_auth_owner_customer_uploads.sql` |
| `20260825031500` | `supabase/migrations/20260825031500_tcg_site_image_slots.sql` |
| `20260825040000` | `supabase/migrations/20260825040000_tcg_quotes_proposals.sql` |

## Why the ledger needed repair

Production schema was already correct. History drifted because:

1. `estimate_requests` was applied manually in the SQL Editor (no matching remote ledger row for `20260824194600`).
2. Auth / owner / customer / uploads was applied manually in the SQL Editor (no matching remote ledger row for `20260825012700`).
3. `site_image_slots` was applied earlier via MCP under a different version: `20260825025041_create_site_image_slots`.
4. The repo now holds the canonical migration filenames for future clean environments.

## Repair status — completed via MCP (Benny-approved)

**Ledger repaired through Curtain Guy MCP only** (`supabase-thecurtainguy` / `xszhnecwhjcywhqjzfit`).

- CLI was **not** used (IPv6 still broken).
- No `db push` / `db reset`.
- No application schema changes.
- No public table create/drop/alter.
- No Storage changes.
- No data-table writes — only `supabase_migrations.schema_migrations`.

### Before ledger

| version          | name                     | created_by                |
|------------------|--------------------------|---------------------------|
| `20260825025041` | `create_site_image_slots` | `admin@thecurtainguy.com` |

(`statements` held the prior MCP-applied DDL; not re-executed.)

### Exact SQL used (ledger only)

```sql
begin;

delete from supabase_migrations.schema_migrations
where version = '20260825025041';

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
values
  ('20260824194600', 'tcg_estimate_requests', null, 'mcp_ledger_repair', null, null),
  ('20260825012700', 'tcg_auth_owner_customer_uploads', null, 'mcp_ledger_repair', null, null),
  ('20260825031500', 'tcg_site_image_slots', null, 'mcp_ledger_repair', null, null)
on conflict (version) do update set
  name = excluded.name,
  statements = excluded.statements,
  created_by = excluded.created_by,
  idempotency_key = excluded.idempotency_key,
  rollback = excluded.rollback;

commit;
```

### After ledger

| version          | name                               | created_by          | statements |
|------------------|------------------------------------|---------------------|------------|
| `20260824194600` | `tcg_estimate_requests`            | `mcp_ledger_repair` | null       |
| `20260825012700` | `tcg_auth_owner_customer_uploads`  | `mcp_ledger_repair` | null       |
| `20260825031500` | `tcg_site_image_slots`             | `mcp_ledger_repair` | null       |

Stale version **not** present: `20260825025041`.

### Counts before / after (unchanged)

| Object | Before | After |
|--------|--------|-------|
| `estimate_requests` rows | 21 | 21 |
| `user_profiles` rows | 2 | 2 |
| `estimate_files` rows | 19 | 19 |
| `site_image_slots` rows | 69 | 69 |
| `estimate-files` bucket | exists | exists |

**Confirmation:** repair only updated migration history — no schema/data/Storage changes.

## CLI workflow (session pooler)

Use the Curtain Guy helper — see **`docs/supabase-cli.md`**.

```bash
pnpm db:list    # migration list
pnpm db:dry     # dry-run before any push
pnpm db:push    # live push only after review/approval
```

`scripts/supabase-tcg` always uses the **session pooler** (`aws-0-us-west-2.pooler.supabase.com`), not `db.xszhnecwhjcywhqjzfit.supabase.co` (IPv6 fails in this WSL/network). Live `db push` is blocked unless `TCG_ALLOW_DB_PUSH=YES` (set by `pnpm db:push`).

MCP: **only** `supabase-thecurtainguy` — never the generic Supabase plugin / other projects.

## Intended CLI repair equivalent (history only)

These update `supabase_migrations.schema_migrations` only (same intent as the MCP SQL above). Prefer MCP ledger repair when CLI repair is uncertain:

```bash
scripts/supabase-tcg migration repair --status applied 20260824194600
scripts/supabase-tcg migration repair --status applied 20260825012700
scripts/supabase-tcg migration repair --status applied 20260825031500
scripts/supabase-tcg migration repair --status reverted 20260825025041
```

## Warnings

- **Do not run `db push` blindly.** Live schema is already correct; a blind push can conflict with existing objects. Always `pnpm db:dry` first.
- **Do not run `db reset` against production.**
- Future migrations: create the SQL file in the repo first, then `pnpm db:dry` → review → `pnpm db:push` only with approval; if SQL must be applied manually, follow with an explicit ledger repair so remote history matches the repo.

## Pending — Phase 6 quotes

**Applied** via `pnpm db:push` (session pooler) on 2026-08-25. Local and remote ledger aligned at `20260825040000`.

Adds: `opportunity_number` / `opportunity_ref` on `estimate_requests`, sequence `tcg_opportunity_number_seq` (start 10000), `assign_estimate_opportunity_ref()`, tables `quotes`, `quote_line_items`, `quote_customer_requests`, `quote_events`, RLS enabled with no public write policies.
