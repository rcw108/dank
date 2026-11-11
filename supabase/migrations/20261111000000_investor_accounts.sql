-- DANK Capital investor accounts, synced one-way from WordPress.
-- WordPress stays the source of truth: the app only reads these tables, and
-- only the sync (service role, via public.sync_investor) writes them.

-- ---------------------------------------------------------------------------
-- Investors: one row per investor, keyed by their Supabase Auth user.
-- ---------------------------------------------------------------------------
create table public.investors (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  wp_user_id            bigint not null unique,
  email                 text not null,
  first_name            text not null default '',
  last_name             text not null default '',
  appeal                text check (appeal in ('Mr.', 'Ms.', 'Mrs.')),
  phone                 text,

  -- Summary block of dank.capital/account
  current_capital       numeric(14, 2),
  capital_as_of         date,
  net_annualized_return numeric(7, 4),   -- percent, e.g. 9.38
  interest_received     numeric(14, 2),
  total_invested        numeric(14, 2),
  total_withdrawn       numeric(14, 2),

  -- Withdrawal rules shown in the Withdraw form
  min_withdraw_balance  numeric(14, 2) not null default 50000,
  card_daily_limit      numeric(14, 2) not null default 500,

  theme                 text check (theme in ('dark', 'light')),
  wp_meta               jsonb not null default '{}'::jsonb,  -- raw custom fields, for mapping and debugging
  synced_at             timestamptz,
  updated_at            timestamptz not null default now()
);

comment on table public.investors is 'Investor accounts mirrored from WordPress user custom fields.';
comment on column public.investors.wp_meta is 'Raw WordPress user meta from the last sync (sensitive keys removed).';

-- ---------------------------------------------------------------------------
-- Operations: the deposits/withdrawals table of dank.capital/account.
-- Replaced as a whole on every sync, so it always matches WordPress.
-- ---------------------------------------------------------------------------
create table public.operations (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.investors (user_id) on delete cascade,
  position        integer not null,                   -- order of the row on the site
  op_date         date not null,
  type            text not null check (type in ('deposit', 'withdrawal')),
  amount          numeric(14, 2) not null,
  present_capital numeric(14, 2),                     -- null for withdrawals
  muted           boolean not null default false,     -- greyed-out row on the site
  note            text,                               -- red-dot note on the site
  unique (user_id, position)
);

create index operations_user_id_idx on public.operations (user_id);

-- ---------------------------------------------------------------------------
-- Sync log: one row per incoming WordPress sync, for diagnostics.
-- ---------------------------------------------------------------------------
create table public.sync_log (
  id          bigint generated always as identity primary key,
  wp_user_id  bigint,
  status      text not null check (status in ('ok', 'error')),
  error       text,
  received_at timestamptz not null default now()
);

create index sync_log_wp_user_id_idx on public.sync_log (wp_user_id, received_at desc);

-- ---------------------------------------------------------------------------
-- Access: investors read only their own rows. Nobody writes through the API
-- except the service role (which bypasses RLS).
-- ---------------------------------------------------------------------------
alter table public.investors  enable row level security;
alter table public.operations enable row level security;
alter table public.sync_log   enable row level security;

revoke all on public.investors, public.operations, public.sync_log from anon, authenticated;
grant select on public.investors, public.operations to authenticated;

create policy "Investors read their own account"
  on public.investors for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Investors read their own operations"
  on public.operations for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Live updates: the app subscribes to its own investors row. Any change to
-- an investor's operations also touches that row, so one subscription
-- covers both tables.
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger investors_touch_updated_at
  before update on public.investors
  for each row execute function public.touch_updated_at();

create function public.touch_investor_from_operation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- sync_investor() touches the investor row itself once per sync.
  if coalesce(current_setting('dank.syncing', true), '') = 'on' then
    return null;
  end if;
  update public.investors
     set updated_at = now()
   where user_id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;

create trigger operations_touch_investor
  after insert or update or delete on public.operations
  for each row execute function public.touch_investor_from_operation();

alter publication supabase_realtime add table public.investors;

-- ---------------------------------------------------------------------------
-- Sync entry point: one atomic snapshot per investor. Called by the
-- /api/wp-sync receiver with the service role; not callable by users.
-- Payload: { user_id, wp_user_id, email, first_name, last_name, appeal, phone,
--            current_capital, capital_as_of, net_annualized_return,
--            interest_received, total_invested, total_withdrawn,
--            min_withdraw_balance?, card_daily_limit?, theme?, wp_meta,
--            operations?: [{ date, type, amount, present_capital, muted, note }] }
-- ---------------------------------------------------------------------------
create function public.sync_investor(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (p ->> 'user_id')::uuid;
begin
  perform set_config('dank.syncing', 'on', true);

  insert into public.investors as i (
    user_id, wp_user_id, email, first_name, last_name, appeal, phone,
    current_capital, capital_as_of, net_annualized_return,
    interest_received, total_invested, total_withdrawn,
    min_withdraw_balance, card_daily_limit, theme, wp_meta, synced_at
  ) values (
    uid,
    (p ->> 'wp_user_id')::bigint,
    p ->> 'email',
    coalesce(p ->> 'first_name', ''),
    coalesce(p ->> 'last_name', ''),
    nullif(p ->> 'appeal', ''),
    nullif(p ->> 'phone', ''),
    (p ->> 'current_capital')::numeric,
    (p ->> 'capital_as_of')::date,
    (p ->> 'net_annualized_return')::numeric,
    (p ->> 'interest_received')::numeric,
    (p ->> 'total_invested')::numeric,
    (p ->> 'total_withdrawn')::numeric,
    coalesce((p ->> 'min_withdraw_balance')::numeric, 50000),
    coalesce((p ->> 'card_daily_limit')::numeric, 500),
    nullif(p ->> 'theme', ''),
    coalesce(p -> 'wp_meta', '{}'::jsonb),
    now()
  )
  on conflict (user_id) do update set
    wp_user_id            = excluded.wp_user_id,
    email                 = excluded.email,
    first_name            = excluded.first_name,
    last_name             = excluded.last_name,
    appeal                = excluded.appeal,
    phone                 = excluded.phone,
    current_capital       = excluded.current_capital,
    capital_as_of         = excluded.capital_as_of,
    net_annualized_return = excluded.net_annualized_return,
    interest_received     = excluded.interest_received,
    total_invested        = excluded.total_invested,
    total_withdrawn       = excluded.total_withdrawn,
    min_withdraw_balance  = excluded.min_withdraw_balance,
    card_daily_limit      = excluded.card_daily_limit,
    theme                 = coalesce(excluded.theme, i.theme),
    wp_meta               = excluded.wp_meta,
    synced_at             = now();

  if p ? 'operations' then
    delete from public.operations where user_id = uid;
    insert into public.operations (user_id, position, op_date, type, amount, present_capital, muted, note)
    select uid,
           t.ord,
           (t.o ->> 'date')::date,
           t.o ->> 'type',
           (t.o ->> 'amount')::numeric,
           (t.o ->> 'present_capital')::numeric,
           coalesce((t.o ->> 'muted')::boolean, false),
           nullif(t.o ->> 'note', '')
      from jsonb_array_elements(p -> 'operations') with ordinality as t(o, ord);
  end if;
end;
$$;

revoke all on function public.sync_investor(jsonb) from public, anon, authenticated;
grant execute on function public.sync_investor(jsonb) to service_role;

revoke all on function public.touch_investor_from_operation() from public, anon, authenticated;
