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
alter table public.users add column if not exists mission text;

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
