-- ============================================================
-- MISSION POSSIBLE — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ZONES
create table if not exists public.zones (
  id    serial primary key,
  name  text unique not null,
  color text not null default '#6b7280'
);

insert into public.zones (name, color) values
  ('Zone Alpha',    '#f97316'),
  ('Zone Beta',     '#8b5cf6'),
  ('Zone Delta',    '#22d3ee'),
  ('Zone Omega',    '#ec4899'),
  ('Adult Leaders', '#6b7280')
on conflict (name) do nothing;

-- USERS
create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  zone_id    integer references public.zones(id) not null,
  created_at timestamptz default now()
);

-- ENTRIES
-- One row per habit completed per day (or per week for weekly/bonus)
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

-- Indexes (safe to re-run)
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_date_idx    on public.entries (date);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
-- No login required; allow anonymous read/write via anon key.

alter table public.zones   enable row level security;
alter table public.users   enable row level security;
alter table public.entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon_read_zones'    and tablename = 'zones')   then create policy "anon_read_zones"     on public.zones   for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_users'    and tablename = 'users')   then create policy "anon_read_users"     on public.users   for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_insert_users'  and tablename = 'users')   then create policy "anon_insert_users"   on public.users   for insert with check (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_update_users'  and tablename = 'users')   then create policy "anon_update_users"   on public.users   for update using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_delete_users'  and tablename = 'users')   then create policy "anon_delete_users"   on public.users   for delete using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_entries'  and tablename = 'entries') then create policy "anon_read_entries"   on public.entries for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_insert_entries' and tablename = 'entries') then create policy "anon_insert_entries" on public.entries for insert with check (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_delete_entries' and tablename = 'entries') then create policy "anon_delete_entries" on public.entries for delete using (true); end if;
end $$;

-- ── REALTIME ──────────────────────────────────────────────
-- Enables live leaderboard updates (safe to re-run)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;
