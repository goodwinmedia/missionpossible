-- ============================================================
-- MISSION POSSIBLE — SUPABASE DATABASE SCHEMA
-- Safe to run multiple times (fully idempotent)
-- ============================================================

-- ZONES
create table if not exists public.zones (
  id     serial primary key,
  name   text unique not null,
  color  text not null default '#6b7280',
  active boolean not null default true
);

-- Upsert zones by ID so re-runs safely update names/colors
insert into public.zones (id, name, color, active) values
  (1, 'Deacons',       '#3b82f6', true),
  (2, 'Teachers',      '#10b981', true),
  (3, 'Priests',       '#7c3aed', true),
  (4, 'YW Class 1',    '#ec4899', true),
  (5, 'YW Class 2',    '#f43f5e', true),
  (6, 'YW Class 3',    '#a855f7', true),
  (7, 'Adult Leaders', '#6b7280', true)
on conflict (id) do update set name = excluded.name, color = excluded.color;
-- Note: active is intentionally NOT reset on re-run so admin toggles persist

-- Add active column if table already existed without it
alter table public.zones add column if not exists active boolean not null default true;

-- Keep sequence in sync after explicit ID inserts
select setval('public.zones_id_seq', (select max(id) from public.zones));

-- USERS
create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  zone_id    integer references public.zones(id) not null,
  mission    text,
  created_at timestamptz default now()
);

-- Add mission column if table already existed without it
alter table public.users add column if not exists mission       text;
alter table public.users add column if not exists companion     text;
alter table public.users add column if not exists district      text;
alter table public.users add column if not exists district_role text;

-- ── DISTRICT / COMPANION ASSIGNMENTS ──────────────────────────────────────────
-- Run once (or re-run safely — all are idempotent SET … WHERE name=…)
-- District 1: Leader = Lincoln Goodwin, STL = Lily Neish
-- District 2: Leader = Max Neish,       STL = Emily Stucki
-- District 3: Leader = CJ Gibson,       STL = Anna Connors

UPDATE public.users SET mission='🇭🇷 Adriatic North',              companion='Charlotte Poll',     district='District 1', district_role=null     WHERE name='Ivy Bullock';
UPDATE public.users SET mission='🇭🇷 Adriatic North',              companion='Ivy Bullock',        district='District 1', district_role=null     WHERE name='Charlotte Poll';
UPDATE public.users SET mission='🇦🇷 Argentina Buenos Aires South', companion='Will Moss',          district='District 1', district_role=null     WHERE name='Brennan Hamilton';
UPDATE public.users SET mission='🇦🇷 Argentina Buenos Aires South', companion='Brennan Hamilton',   district='District 1', district_role=null     WHERE name='Will Moss';
UPDATE public.users SET mission='🇦🇺 Australia Brisbane',           companion='Clara Hansen',       district='District 1', district_role=null     WHERE name='Lylah Wobser';
UPDATE public.users SET mission='🇦🇺 Australia Brisbane',           companion='Lylah Wobser',       district='District 1', district_role=null     WHERE name='Clara Hansen';
UPDATE public.users SET mission='🇧🇪 Belgium/Netherlands',          companion='Stella Riding',      district='District 1', district_role=null     WHERE name='Jerzie Mower';
UPDATE public.users SET mission='🇧🇪 Belgium/Netherlands',          companion='Jerzie Mower',       district='District 1', district_role=null     WHERE name='Stella Riding';
UPDATE public.users SET mission='🇧🇷 Brazil São Paulo North',       companion='Violet Egan',        district='District 1', district_role=null     WHERE name='Norah Thornton';
UPDATE public.users SET mission='🇧🇷 Brazil São Paulo North',       companion='Norah Thornton',     district='District 1', district_role=null     WHERE name='Violet Egan';
UPDATE public.users SET mission='🇧🇬 Bulgaria/Central Eurasian',    companion='Kate Hansen',        district='District 1', district_role=null     WHERE name='Nora Warnick';
UPDATE public.users SET mission='🇧🇬 Bulgaria/Central Eurasian',    companion='Nora Warnick',       district='District 1', district_role=null     WHERE name='Kate Hansen';
UPDATE public.users SET mission='🇨🇦 Canada Montreal',              companion='Decklin Ragar',      district='District 1', district_role=null     WHERE name='Joe Egan';
UPDATE public.users SET mission='🇨🇦 Canada Montreal',              companion='Joe Egan',           district='District 1', district_role=null     WHERE name='Decklin Ragar';
UPDATE public.users SET mission='🇨🇱 Chile Santiago East',          companion='Oliver Gourley',     district='District 1', district_role=null     WHERE name='James Riding';
UPDATE public.users SET mission='🇨🇱 Chile Santiago East',          companion='James Riding',       district='District 1', district_role=null     WHERE name='Oliver Gourley';
UPDATE public.users SET mission='🇵🇭 Philippines Manila',           companion='Emma Moss',          district='District 1', district_role=null     WHERE name='Kate Stucki';
UPDATE public.users SET mission='🇵🇭 Philippines Manila',           companion='Kate Stucki',        district='District 1', district_role=null     WHERE name='Emma Moss';
UPDATE public.users SET mission='🇩🇴 Dominican Republic',           companion='Jude Gourley',       district='District 1', district_role='leader' WHERE name='Lincoln Goodwin';
UPDATE public.users SET mission='🇩🇴 Dominican Republic',           companion='Lincoln Goodwin',    district='District 1', district_role=null     WHERE name='Jude Gourley';
UPDATE public.users SET mission='🇮🇹 Italy Milan',                  companion='Hailey Nehren',      district='District 1', district_role='stl'    WHERE name='Lily Neish';
UPDATE public.users SET mission='🇮🇹 Italy Milan',                  companion='Lily Neish',         district='District 1', district_role=null     WHERE name='Hailey Nehren';

UPDATE public.users SET mission='🇪🇨 Ecuador Quito South',         companion='Olivia Thornton',    district='District 2', district_role=null     WHERE name='Brooklyn Gourley';
UPDATE public.users SET mission='🇪🇨 Ecuador Quito South',         companion='Brooklyn Gourley',   district='District 2', district_role=null     WHERE name='Olivia Thornton';
UPDATE public.users SET mission='🇬🇧 England Bristol',             companion='Will Winder',        district='District 2', district_role='leader' WHERE name='Max Neish';
UPDATE public.users SET mission='🇬🇧 England Bristol',             companion='Max Neish',          district='District 2', district_role=null     WHERE name='Will Winder';
UPDATE public.users SET mission='🇫🇮 Finland Helsinki',            companion='Skye Pritchett',     district='District 2', district_role=null     WHERE name='Evalee Ragar';
UPDATE public.users SET mission='🇫🇮 Finland Helsinki',            companion='Evalee Ragar',       district='District 2', district_role=null     WHERE name='Skye Pritchett';
UPDATE public.users SET mission='🇫🇷 France Lyon',                 companion='Mason Nehren',       district='District 2', district_role=null     WHERE name='Corban Livingston';
UPDATE public.users SET mission='🇫🇷 France Lyon',                 companion='Corban Livingston',  district='District 2', district_role=null     WHERE name='Mason Nehren';
UPDATE public.users SET mission='🇩🇪 Germany Hamburg',             companion='Dane Goodwin',       district='District 2', district_role=null     WHERE name='Adam Brown';
UPDATE public.users SET mission='🇩🇪 Germany Hamburg',             companion='Adam Brown',         district='District 2', district_role=null     WHERE name='Dane Goodwin';
UPDATE public.users SET mission='🇬🇹 Guatemala Antigua',           companion='Elle McFarlane',     district='District 2', district_role=null     WHERE name='Lanie Sutton';
UPDATE public.users SET mission='🇬🇹 Guatemala Antigua',           companion='Lanie Sutton',       district='District 2', district_role=null     WHERE name='Elle McFarlane';
UPDATE public.users SET mission='🇺🇸 Honolulu Hawaii',             companion='Emily Stucki',       district='District 2', district_role=null     WHERE name='Lauren Robinson';
UPDATE public.users SET mission='🇺🇸 Honolulu Hawaii',             companion='Lauren Robinson',    district='District 2', district_role='stl'    WHERE name='Emily Stucki';
UPDATE public.users SET mission='🇯🇵 Japan Sendai',                companion='Max Barclay',        district='District 2', district_role=null     WHERE name='Ethan Robinson';
UPDATE public.users SET mission='🇯🇵 Japan Sendai',                companion='Ethan Robinson',     district='District 2', district_role=null     WHERE name='Max Barclay';
UPDATE public.users SET mission='🇯🇵 Japan Sendai',                companion='Ethan Robinson',     district='District 2', district_role=null     WHERE name='Dan Egan';
UPDATE public.users SET mission='🇰🇷 Korea Seoul',                 companion='Macy Winder',        district='District 2', district_role=null     WHERE name='Emma Beauchene';
UPDATE public.users SET mission='🇰🇷 Korea Seoul',                 companion='Emma Beauchene',     district='District 2', district_role=null     WHERE name='Macy Winder';
UPDATE public.users SET mission='🇳🇿 New Zealand Wellington',      companion='Asher Jacobsen',     district='District 2', district_role=null     WHERE name='Seth Gourley';
UPDATE public.users SET mission='🇳🇿 New Zealand Wellington',      companion='Seth Gourley',       district='District 2', district_role=null     WHERE name='Asher Jacobsen';

UPDATE public.users SET mission='🇳🇴 Norway Oslo',                 companion='Will Jepsen',        district='District 3', district_role=null     WHERE name='Dylan Beauchene';
UPDATE public.users SET mission='🇳🇴 Norway Oslo',                 companion='Dylan Beauchene',    district='District 3', district_role=null     WHERE name='Will Jepsen';
UPDATE public.users SET mission='🇵🇭 Philippines Naga',            companion='Sarah Peters',       district='District 3', district_role=null     WHERE name='Macy Neish';
UPDATE public.users SET mission='🇵🇭 Philippines Naga',            companion='Macy Neish',         district='District 3', district_role=null     WHERE name='Sarah Peters';
UPDATE public.users SET mission='🇵🇹 Portugal Lisbon',             companion='Charlotte Jacobsen', district='District 3', district_role=null     WHERE name='Lauren Bunker';
UPDATE public.users SET mission='🇵🇹 Portugal Lisbon',             companion='Lauren Bunker',      district='District 3', district_role=null     WHERE name='Charlotte Jacobsen';
UPDATE public.users SET mission='🇷🇴 Romania Bucharest',           companion='Bree Hansen',        district='District 3', district_role=null     WHERE name='Aidan Nibley';
UPDATE public.users SET mission='🇷🇴 Romania Bucharest',           companion='Aidan Nibley',       district='District 3', district_role=null     WHERE name='Bree Hansen';
UPDATE public.users SET mission='🇷🇺 Russia Moscow',               companion='Hudson Poll',        district='District 3', district_role=null     WHERE name='Kai Nehren';
UPDATE public.users SET mission='🇷🇺 Russia Moscow',               companion='Kai Nehren',         district='District 3', district_role=null     WHERE name='Hudson Poll';
UPDATE public.users SET mission='🇬🇧 Scotland/Ireland',            companion='Mason McFarlane',    district='District 3', district_role=null     WHERE name='Camden Strong';
UPDATE public.users SET mission='🇬🇧 Scotland/Ireland',            companion='Camden Strong',      district='District 3', district_role=null     WHERE name='Mason McFarlane';
UPDATE public.users SET mission='🇿🇦 South Africa Cape Town',      companion='Emma Peters',        district='District 3', district_role=null     WHERE name='Lily Goodwin';
UPDATE public.users SET mission='🇿🇦 South Africa Cape Town',      companion='Lily Goodwin',       district='District 3', district_role=null     WHERE name='Emma Peters';
UPDATE public.users SET mission='🇹🇼 Taiwan Taipei',               companion='Taylor Goodwin',     district='District 3', district_role=null     WHERE name='Brady Bunker';
UPDATE public.users SET mission='🇹🇼 Taiwan Taipei',               companion='Brady Bunker',       district='District 3', district_role=null     WHERE name='Taylor Goodwin';
UPDATE public.users SET mission='🇸🇪 Sweden Stockholm',            companion='Norah Gardner',      district='District 3', district_role='stl'    WHERE name='Anna Connors';
UPDATE public.users SET mission='🇸🇪 Sweden Stockholm',            companion='Anna Connors',       district='District 3', district_role=null     WHERE name='Norah Gardner';
UPDATE public.users SET mission='🇪🇸 Spain Barcelona',             companion='Miles Barclay',      district='District 3', district_role='leader' WHERE name='CJ Gibson';
UPDATE public.users SET mission='🇪🇸 Spain Barcelona',             companion='CJ Gibson',          district='District 3', district_role=null     WHERE name='Miles Barclay';
UPDATE public.users SET mission='🇻🇪 Venezuela Caracas',           companion='Brylie Mower',       district='District 3', district_role=null     WHERE name='Maren Hamilton';
UPDATE public.users SET mission='🇻🇪 Venezuela Caracas',           companion='Maren Hamilton',     district='District 3', district_role=null     WHERE name='Brylie Mower';

-- ENTRIES
-- habit_id matches client-side IDs: 'd1'–'d9', 'w1'–'w4', 'b1'–'b4'
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade not null,
  habit_id   text not null,
  category   text not null,   -- spiritual | physical | social | emotional
  points     integer not null,
  type       text not null,   -- daily | weekly | bonus
  date       date not null,
  created_at timestamptz default now(),
  constraint entries_unique unique (user_id, habit_id, date)
);

-- Indexes
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_date_idx    on public.entries (date);

-- Aggregated points per user (one row per user who has entries). Read-only: does
-- not insert, update, or delete any rows in `entries` (or any other table).
-- Used by the app for leaderboards without downloading every entry row.
--
-- Only entries with `date` inside [p_start, p_end] are counted. The defaults
-- match the program's official scoring window so back-dated completions
-- outside the window cannot inflate the leaderboard, even if a stale client
-- calls this without arguments.
drop function if exists public.entry_totals_by_user();
drop function if exists public.entry_totals_by_user(date, date);
create or replace function public.entry_totals_by_user(
  p_start date default '2026-04-05',
  p_end   date default '2026-05-03'
)
returns table (user_id uuid, total_points bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select e.user_id, sum(e.points)::bigint as total_points
  from public.entries e
  where e.date >= p_start and e.date <= p_end
  group by e.user_id;
$$;

grant execute on function public.entry_totals_by_user(date, date) to anon, authenticated, service_role;

-- ── ROW LEVEL SECURITY ────────────────────────────────────

alter table public.zones   enable row level security;
alter table public.users   enable row level security;
alter table public.entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon_read_zones'     and tablename = 'zones')   then create policy "anon_read_zones"     on public.zones   for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_update_zones'   and tablename = 'zones')   then create policy "anon_update_zones"   on public.zones   for update using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_users'     and tablename = 'users')   then create policy "anon_read_users"     on public.users   for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_insert_users'   and tablename = 'users')   then create policy "anon_insert_users"   on public.users   for insert with check (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_update_users'   and tablename = 'users')   then create policy "anon_update_users"   on public.users   for update using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_delete_users'   and tablename = 'users')   then create policy "anon_delete_users"   on public.users   for delete using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_entries'   and tablename = 'entries') then create policy "anon_read_entries"   on public.entries for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_insert_entries' and tablename = 'entries') then create policy "anon_insert_entries" on public.entries for insert with check (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_delete_entries' and tablename = 'entries') then create policy "anon_delete_entries" on public.entries for delete using (true); end if;
end $$;

-- CUSTOM HABITS (admin-created extra credit & bonus tasks)
create table if not exists public.custom_habits (
  id         text primary key,
  label      text not null,
  category   text not null,   -- spiritual | physical | social | emotional
  type       text not null,   -- 'extra' (one-time) | 'repeat' (daily)
  points     integer not null default 5,
  active     boolean not null default true,
  created_at timestamptz default now()
);

alter table public.custom_habits enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon_read_custom_habits'   and tablename = 'custom_habits') then create policy "anon_read_custom_habits"   on public.custom_habits for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_insert_custom_habits' and tablename = 'custom_habits') then create policy "anon_insert_custom_habits" on public.custom_habits for insert with check (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_delete_custom_habits' and tablename = 'custom_habits') then create policy "anon_delete_custom_habits" on public.custom_habits for delete using (true); end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;

-- ── CHALLENGE LOCK ────────────────────────────────────────
-- Run this block once at the end of the program to permanently disable
-- new entries from the public anon role. Reads still work; admins can
-- still mutate via the Supabase SQL editor (service_role bypasses RLS).
-- To re-open logging: re-create the policies by re-running the policy
-- block earlier in this file.
do $$ begin
  if exists (select 1 from pg_policies where policyname = 'anon_insert_entries' and tablename = 'entries') then
    drop policy "anon_insert_entries" on public.entries;
  end if;
  if exists (select 1 from pg_policies where policyname = 'anon_delete_entries' and tablename = 'entries') then
    drop policy "anon_delete_entries" on public.entries;
  end if;
end $$;
