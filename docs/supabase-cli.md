# Supabase CLI — The Curtain Guy

Safe local workflow for migration checks against **only** project `xszhnecwhjcywhqjzfit`.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm db:list` | List local vs remote migrations |
| `pnpm db:dry` | `db push --dry-run` (no schema changes) |
| `pnpm db:push` | Live `db push` — **only after review/approval** |

Always run **`pnpm db:dry` before any push**. Use **`pnpm db:push` only after Benny reviews and approves**.

## Why the helper exists

`scripts/supabase-tcg` always connects via the **session pooler**:

- Host: `aws-0-us-west-2.pooler.supabase.com`
- User: `postgres.xszhnecwhjcywhqjzfit`
- Port: `5432`
- Database: `postgres`

The direct DB host `db.xszhnecwhjcywhqjzfit.supabase.co` resolves to **IPv6** and fails in this WSL/network (`network is unreachable`). Do not use the direct host.

## Password

- Set `SUPABASE_DB_PASSWORD` in the environment, **or**
- Let the helper prompt (input is hidden).

Do **not** put the DB password in `package.json`, `.env.example`, git, or chat logs.

## Live push guard

Bare `db push` (without `--dry-run`) is blocked unless `TCG_ALLOW_DB_PUSH=YES`.  
`pnpm db:push` sets that flag intentionally. Prefer dry-run first.

## Hard blocks (never allowed)

`scripts/supabase-tcg` **always refuses** these — there is no env override:

| Command | Why |
|---------|-----|
| `db reset` | Destroys all database data |
| `db execute` | Runs arbitrary SQL on remote |
| `projects delete` / `projects remove` | Deletes the Supabase project |
| `branches delete` | Deletes a database branch |

Bypassing the helper with raw `npx supabase …` is still possible locally; always use `pnpm db:*` for Curtain Guy remote work.

## MCP

- Use **only** `supabase-thecurtainguy` (project ref `xszhnecwhjcywhqjzfit`).
- Do **not** use the generic Supabase MCP / other projects (including ZATOV).

See also: `docs/supabase-migration-ledger.md`.
