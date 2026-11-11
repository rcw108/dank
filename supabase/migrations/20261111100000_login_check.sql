-- Login check against WordPress: the server links WordPress investors to
-- Supabase Auth users and looks investors up by email.

-- Finds an existing Supabase Auth user by email (e.g. someone who signed in
-- before their WordPress account was synced). Server-side sync only.
create function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;

-- Emails are stored lower-case by the sync; login looks them up.
create index investors_email_idx on public.investors (email);

-- The sync runs as service_role; grant it explicitly rather than relying on
-- project defaults.
grant select, insert, update, delete on public.investors, public.operations, public.sync_log to service_role;
grant usage, select on all sequences in schema public to service_role;
