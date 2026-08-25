# Owner auth setup — The Curtain Guy

Use only the **The Curtain Guy** Supabase project. Do not use ZATOV credentials.

## 1. Enable Auth

1. Open Supabase → Authentication → Providers.
2. Ensure **Email** is enabled.
3. Enable **Confirm email** (recommended) so guest estimate linking only works for verified addresses.
4. Do **not** enable Google or magic links for this phase.

## 2. Create the owner Auth user

1. Authentication → Users → Add user.
2. Email: `admin@thecurtainguy.com`
3. Set a strong password.
4. Confirm / verify the email in the dashboard (or complete the confirmation email flow).

Public signup must never create an owner. The signup trigger always inserts `role = 'customer'`.

## 3. Promote to owner

After the Auth user exists (and the `user_profiles` trigger has run), execute in SQL Editor:

```sql
update public.user_profiles
set role = 'owner', is_active = true, updated_at = now()
where lower(email) = 'admin@thecurtainguy.com';
```

### Fallback if the profile row is missing

Replace `USER_UUID` with the Auth user id from Authentication → Users:

```sql
insert into public.user_profiles (id, email, role, is_active)
values ('USER_UUID', 'admin@thecurtainguy.com', 'owner', true)
on conflict (id) do update
set
  role = 'owner',
  is_active = true,
  email = excluded.email,
  updated_at = now();
```

## 4. Sign in

1. Visit `/admin/login`.
2. Sign in with `admin@thecurtainguy.com` and the password you set.
3. You should land on `/admin`.

Customers sign up at `/account/signup` and receive the `customer` role only.

## 5. Security reminders

- Never promote a public customer to owner unless intentionally done in SQL.
- Never expose the service role key to the browser.
- Keep The Curtain Guy Auth separate from ZATOV.
