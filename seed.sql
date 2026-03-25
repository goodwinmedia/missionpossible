-- ============================================================
-- MISSION POSSIBLE — USER SEED DATA
-- Run this AFTER schema.sql in Supabase SQL Editor
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- Missions left null — to be assigned later via admin panel
-- ============================================================

-- DEACONS (zone_id = 1)
insert into public.users (name, zone_id, mission) values
  ('Miles Barclay',    1, null),
  ('Connor Dimond',    1, null),
  ('Taylor Goodwin',   1, null),
  ('Jude Gourley',     1, null),
  ('Asher Jacobsen',   1, null),
  ('Will Jepsen',      1, null),
  ('Mason McFarlane',  1, null),
  ('Decklin Ragar',    1, null),
  ('William Winder',   1, null)
on conflict (name) do nothing;

-- TEACHERS (zone_id = 2)
insert into public.users (name, zone_id, mission) values
  ('Max Barclay',      2, null),
  ('Deklan Bavaro',    2, null),
  ('Tristan Bavaro',   2, null),
  ('Brady Bunker',     2, null),
  ('Dane Goodwin',     2, null),
  ('Oliver Gourley',   2, null),
  ('Brennan Hamilton', 2, null),
  ('William Moss',     2, null),
  ('Mason Nehren',     2, null),
  ('Hudson Poll',      2, null)
on conflict (name) do nothing;

-- PRIESTS (zone_id = 3)
insert into public.users (name, zone_id, mission) values
  ('Joshua Bavaro Jr.', 3, null),
  ('Dylan Beauchene',   3, null),
  ('Adam Brown',        3, null),
  ('Dan Egan',          3, null),
  ('Joseph Egan',       3, null),
  ('Colby Gibson',      3, null),
  ('Lincoln Goodwin',   3, null),
  ('Seth Gourley',      3, null),
  ('Corban Livingston', 3, null),
  ('Kai Nehren',        3, null),
  ('Max Neish',         3, null),
  ('Joshua Peang',      3, null),
  ('James Riding',      3, null),
  ('Ethan Robinson',    3, null),
  ('Camden Strong',     3, null),
  ('Ryder Zumwalt',     3, null)
on conflict (name) do nothing;

-- YW CLASS 1 — age 12 (zone_id = 4)
insert into public.users (name, zone_id, mission) values
  ('Violet Egan',      4, null),
  ('Norah Gardner',    4, null),
  ('Kate Hansen',      4, null),
  ('Emma Moss',        4, null),
  ('Hailey Nehren',    4, null),
  ('Charlotte Poll',   4, null),
  ('Norah Thornton',   4, null)
on conflict (name) do nothing;

-- YW CLASS 2 — ages 13–15 (zone_id = 5)
insert into public.users (name, zone_id, mission) values
  ('Emma Beauchene',   5, null),
  ('Bree Hansen',      5, null),
  ('Clara Hansen',     5, null),
  ('Charlotte Jacobsen', 5, null),
  ('Swayzie King',     5, null),
  ('Elle McFarlane',   5, null),
  ('Brylie Mower',     5, null),
  ('Emma Peters',      5, null),
  ('Sarah Peters',     5, null),
  ('Evalee Ragar',     5, null),
  ('Stella Riding',    5, null),
  ('Kate Stucki',      5, null),
  ('Olivia Thornton',  5, null),
  ('Macy Winder',      5, null)
on conflict (name) do nothing;

-- YW CLASS 3 — ages 16–18 (zone_id = 6)
insert into public.users (name, zone_id, mission) values
  ('Brooke Barton',       6, null),
  ('Ivy Bullock',         6, null),
  ('Anna Connors',        6, null),
  ('Lily Goodwin',        6, null),
  ('Brooklyn Gourley',    6, null),
  ('Maren Hamilton',      6, null),
  ('Jerzie Mower',        6, null),
  ('Lily Neish',          6, null),
  ('Macy Neish',          6, null),
  ('Aidan Nibley',        6, null),
  ('Madeleine Sutton',    6, null),
  ('Nora Warnick',        6, null),
  ('Charlotte Williamson', 6, null),
  ('Lylah Wobser',        6, null)
on conflict (name) do nothing;
