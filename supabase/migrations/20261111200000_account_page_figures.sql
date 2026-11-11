-- The app shows exactly what dank.capital/account shows. WordPress now sends
-- the account page's own figures (calculated by the theme) instead of raw
-- custom fields, so the tables follow the page:
--   * net annualized return is kept as the page prints it ("9.38%"),
--     with the "terms changed" tooltip next to it;
--   * company name under the investor's name, and the "Org." appeal;
--   * "Your terms changed to X%" rows in the operations table;
--   * the Referral Bonus table some accounts see.

alter table public.investors
  alter column net_annualized_return type text
    using case when net_annualized_return is null then null else net_annualized_return::text || '%' end,
  add column return_note  text,
  add column company_name text,
  add column referral     jsonb;

comment on column public.investors.net_annualized_return is 'As printed on the account page, e.g. 9.38%.';
comment on column public.investors.referral is 'Referral Bonus table of the account page; null when the page does not show it.';
comment on column public.investors.wp_meta is 'Sync diagnostics: roles, send time and calculation error, if any.';

alter table public.investors drop constraint investors_appeal_check;
alter table public.investors
  add constraint investors_appeal_check check (appeal in ('Mr.', 'Ms.', 'Mrs.', 'Org.'));

alter table public.operations drop constraint operations_type_check;
alter table public.operations
  add constraint operations_type_check check (type in ('deposit', 'withdrawal', 'terms')),
  alter column amount drop not null,                 -- terms rows have a rate instead
  add column rate      text,                         -- "Your terms changed to {rate}%"
  add column direction text check (direction in ('upgrade', 'downgrade'));

-- ---------------------------------------------------------------------------
-- Sync entry point, new payload:
--   { user_id, wp_user_id, email, first_name, last_name, appeal, phone,
--     company_name, theme, wp_meta,
--     account?: { capital_as_of, current_capital, net_annualized_return,
--                 return_note, interest_received, total_invested,
--                 total_withdrawn, referral,
--                 operations: [{ date, type, amount, present_capital, muted,
--                                note, rate, direction }] } }
-- Without "account" (WordPress could not calculate it), the profile is
-- updated and the last good figures and operations stay as they are.
-- One statement on investors, so the app gets one live update per sync.
-- ---------------------------------------------------------------------------
create or replace function public.sync_investor(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid    := (p ->> 'user_id')::uuid;
  a   jsonb   := case when jsonb_typeof(p -> 'account') = 'object' then p -> 'account' end;
  has boolean := a is not null;
begin
  perform set_config('dank.syncing', 'on', true);

  if has then
    delete from public.operations where user_id = uid;
  end if;

  insert into public.investors as i (
    user_id, wp_user_id, email, first_name, last_name, appeal, phone,
    company_name, theme, wp_meta, synced_at,
    current_capital, capital_as_of, net_annualized_return, return_note,
    interest_received, total_invested, total_withdrawn, referral
  ) values (
    uid,
    (p ->> 'wp_user_id')::bigint,
    p ->> 'email',
    coalesce(p ->> 'first_name', ''),
    coalesce(p ->> 'last_name', ''),
    nullif(p ->> 'appeal', ''),
    nullif(p ->> 'phone', ''),
    nullif(p ->> 'company_name', ''),
    nullif(p ->> 'theme', ''),
    coalesce(p -> 'wp_meta', '{}'::jsonb),
    now(),
    (a ->> 'current_capital')::numeric,
    (a ->> 'capital_as_of')::date,
    a ->> 'net_annualized_return',
    nullif(a ->> 'return_note', ''),
    (a ->> 'interest_received')::numeric,
    (a ->> 'total_invested')::numeric,
    (a ->> 'total_withdrawn')::numeric,
    case when jsonb_typeof(a -> 'referral') = 'object' then a -> 'referral' end
  )
  on conflict (user_id) do update set
    wp_user_id            = excluded.wp_user_id,
    email                 = excluded.email,
    first_name            = excluded.first_name,
    last_name             = excluded.last_name,
    appeal                = excluded.appeal,
    phone                 = excluded.phone,
    company_name          = excluded.company_name,
    theme                 = coalesce(excluded.theme, i.theme),
    wp_meta               = excluded.wp_meta,
    synced_at             = now(),
    current_capital       = case when has then excluded.current_capital       else i.current_capital end,
    capital_as_of         = case when has then excluded.capital_as_of         else i.capital_as_of end,
    net_annualized_return = case when has then excluded.net_annualized_return else i.net_annualized_return end,
    return_note           = case when has then excluded.return_note           else i.return_note end,
    interest_received     = case when has then excluded.interest_received     else i.interest_received end,
    total_invested        = case when has then excluded.total_invested        else i.total_invested end,
    total_withdrawn       = case when has then excluded.total_withdrawn       else i.total_withdrawn end,
    referral              = case when has then excluded.referral              else i.referral end;

  if has then
    insert into public.operations (
      user_id, position, op_date, type, amount, present_capital, muted, note, rate, direction
    )
    select uid,
           t.ord,
           (t.o ->> 'date')::date,
           t.o ->> 'type',
           (t.o ->> 'amount')::numeric,
           (t.o ->> 'present_capital')::numeric,
           coalesce((t.o ->> 'muted')::boolean, false),
           nullif(t.o ->> 'note', ''),
           nullif(t.o ->> 'rate', ''),
           nullif(t.o ->> 'direction', '')
      from jsonb_array_elements(coalesce(a -> 'operations', '[]'::jsonb)) with ordinality as t(o, ord);
  end if;
end;
$$;

revoke all on function public.sync_investor(jsonb) from public, anon, authenticated;
grant execute on function public.sync_investor(jsonb) to service_role;
