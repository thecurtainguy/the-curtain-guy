# Production setup — The Curtain Guy

This document covers **The Curtain Guy** only. Do not reuse ZATOV Supabase, Resend, or Vercel projects.

## 1. Vercel environment variables

Add these on the The Curtain Guy Vercel project (Production + Preview as needed), then redeploy:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
TCG_ESTIMATE_NOTIFY_TO=admin@thecurtainguy.com
TCG_ESTIMATE_FROM=The Curtain Guy <estimates@thecurtainguy.com>
TCG_SEND_CUSTOMER_CONFIRMATION=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=https://thecurtainguy.com
```

- `SUPABASE_*` and `RESEND_API_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the browser publishable (anon) key.
- Local development uses `.env.local` (gitignored). See `.env.example` for placeholders only.

## 2. Supabase

Required in the **The Curtain Guy** project:

1. Auth: email/password enabled; email confirmation enabled (recommended).
2. Tables from migrations:
   - `estimate_requests`
   - `user_profiles`
   - `estimate_files`
3. Private storage bucket: `estimate-files` (10MB limit; PDF/PNG/JPEG/WEBP).
4. Owner user: `admin@thecurtainguy.com` promoted via SQL (see `docs/owner-auth-setup.md`).

### Apply migrations

Phase 3 `estimate_requests` may already exist (applied via SQL Editor). If CLI history is misaligned:

1. Open SQL Editor in The Curtain Guy Supabase.
2. Run `supabase/migrations/20260825012700_tcg_auth_owner_customer_uploads.sql` in full.
3. Do **not** run `db reset` or destructive commands.

### Storage bucket (dashboard fallback)

If the SQL bucket insert fails:

1. Storage → New bucket → name `estimate-files`.
2. Public: **off**.
3. File size limit: 10MB.
4. Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`.
5. Do not add public read policies. The app uses short-lived signed URLs from the server.

## 3. Resend

1. Use the The Curtain Guy Resend account.
2. Verify `thecurtainguy.com`.
3. Set `TCG_ESTIMATE_FROM=The Curtain Guy <estimates@thecurtainguy.com>`.
4. Admin notifications go to `TCG_ESTIMATE_NOTIFY_TO`.

### Auth email rate limits (important)

Supabase **built-in Auth email** is rate limited. During local testing you may see:

> email rate limit exceeded

That is a Supabase Auth limit, not an application bug. The signup UI shows a friendly wait message when this happens.

For production, configure **custom SMTP** so Auth confirmation emails send through Resend:

1. Supabase → **Authentication** → **SMTP Settings** (or Project Settings → Auth → SMTP).
2. Enable custom SMTP.
3. Host: `smtp.resend.com`
4. Port: `465` (or `587` if required by the dashboard).
5. Username: `resend`
6. Password: your Resend API key (store only in Supabase dashboard — never in git or docs).
7. Sender email: a verified domain address, for example:
   - `The Curtain Guy <estimates@thecurtainguy.com>`
   - or `The Curtain Guy <auth@thecurtainguy.com>`
8. Save, then send a test confirmation email.

Do **not** put SMTP passwords or Resend API keys in this repository.

## 4. Vercel

1. Env vars on **The Curtain Guy** project only.
2. Redeploy after env changes.
3. Confirm `NEXT_PUBLIC_SITE_URL` matches the live domain.

## 5. Security reminders

- `.env.local` is ignored; never commit secrets.
- No service role or Resend keys in git, docs, or client bundles.
- Customers access only their own estimates through server routes.
- Owners access admin via `/admin` after role check (`owner` + active + verified).
- Guest uploads require a short-lived upload token from estimate creation — never sign uploads by estimate id alone.
- The Curtain Guy Supabase / Resend / Vercel are separate from ZATOV.
