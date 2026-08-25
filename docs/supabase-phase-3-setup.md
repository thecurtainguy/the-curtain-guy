# Supabase Phase 3 — Estimate Requests Setup

This guide covers the The Curtain Guy Supabase project only. Do not use ZATOV or other project credentials.

## 1. Open the project

Sign in to [Supabase](https://supabase.com/dashboard) and open **The Curtain Guy** project.

## 2. Run the migration

1. Go to **SQL Editor**.
2. Open `supabase/migrations/20260824194600_tcg_estimate_requests.sql` from this repo.
3. Paste the full SQL into the editor and click **Run**.

This creates the `estimate_requests` table, indexes, RLS (enabled with no public policies), and an `updated_at` trigger.

## 3. Copy API credentials

1. Go to **Project Settings → API**.
2. Copy the **Project URL** (`SUPABASE_URL`).
3. Copy the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`).

The service role key bypasses RLS and must only be used on the server (Next.js API route).

## 4. Configure environment variables

Add values only in:

- Local: `.env.local` (never commit this file)
- Vercel: Project → Settings → Environment Variables

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
TCG_ESTIMATE_NOTIFY_TO=admin@thecurtainguy.com
TCG_ESTIMATE_FROM=The Curtain Guy <onboarding@resend.dev>
NEXT_PUBLIC_SITE_URL=https://thecurtainguy.com
```

See `.env.example` for the full list.

## 5. Resend

1. Sign in to the **The Curtain Guy** Resend account.
2. Create or copy an API key → `RESEND_API_KEY`.
3. For production, verify `thecurtainguy.com` and set:

   `TCG_ESTIMATE_FROM=The Curtain Guy <estimates@thecurtainguy.com>`

## Security

- Never paste service role keys into ChatGPT, GitHub issues, frontend code, or public files.
- Never prefix `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` with `NEXT_PUBLIC_`.
- Public browsers do not insert into `estimate_requests`; only the server route uses the service role.
