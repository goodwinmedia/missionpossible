-- ============================================================
-- MISSION POSSIBLE — USER SEED DATA
-- Run this AFTER schema.sql in Supabase SQL Editor
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- Missions left null — to be assigned later via admin panel
-- ============================================================

-- DEACONS (zone_id = 1)
insert into public.users (name, zone_id, mission) values
  ('Miles Barclay',       1, null),
  ('Connor Dimond',       1, null),
  ('Taylor Goodwin',      1, null),
  ('Jude Gourley',        1, null),
  ('Asher Jacobsen',      1, null),
  ('Will Jepsen',         1, null),
  ('Mason McFarlane',     1, null),
  ('Decklin Joel Ragar',  1, null),
  ('William Rex Winder',  1, null)
on conflict (name) do nothing;

-- TEACHERS (zone_id = 2)
insert into public.users (name, zone_id, mission) values
  ('Max Barclay',           2, null),
  ('Deklan Jay Bavaro',     2, null),
  ('Tristan Joseph Bavaro', 2, null),
  ('Brady Bunker',          2, null),
  ('Dane Goodwin',          2, null),
  ('Oliver Gourley',        2, null),
  ('Brennan Hamilton',      2, null),
  ('William Taylor Moss',   2, null),
  ('Mason Scott Nehren',    2, null),
  ('Hudson Max Poll',       2, null)
on conflict (name) do nothing;

-- PRIESTS (zone_id = 3)
insert into public.users (name, zone_id, mission) values
  ('Joshua Jacob Bavaro Jr.', 3, null),
  ('Dylan Beauchene',          3, null),
  ('Adam Kendrick Brown',      3, null),
  ('Dan Egan',                 3, null),
  ('Joseph Egan',              3, null),
  ('Colby Gibson',             3, null),
  ('Lincoln Goodwin',          3, null),
  ('Seth Gourley',             3, null),
  ('Corban Livingston',        3, null),
  ('Kai Michael Nehren',       3, null),
  ('Max Neish',                3, null),
  ('Joshua Somnang Peang',     3, null),
  ('James Riding',             3, null),
  ('Ethan Robinson',           3, null),
  ('Camden Clayton Strong',    3, null),
  ('Ryder Zumwalt',            3, null)
on conflict (name) do nothing;

-- YW CLASS 1 — age 12 (zone_id = 4)
insert into public.users (name, zone_id, mission) values
  ('Violet Lauren Egan',      4, null),
  ('Norah Bell Gardner',      4, null),
  ('Kate Melissa Hansen',     4, null),
  ('Emma Moss',               4, null),
  ('Hailey Nehren',           4, null),
  ('Charlotte June Poll',     4, null),
  ('Norah Rosaland Thornton', 4, null)
on conflict (name) do nothing;

-- YW CLASS 2 — ages 13–15 (zone_id = 5)
insert into public.users (name, zone_id, mission) values
  ('Emma Katherine Beauchene', 5, null),
  ('Bree Estella Hansen',      5, null),
  ('Clara Marie Hansen',       5, null),
  ('Charlotte Jacobsen',       5, null),
  ('Swayzie Hannah King',      5, null),
  ('Elle McFarlane',           5, null),
  ('Brylie Mower',             5, null),
  ('Emma Elizabeth Peters',    5, null),
  ('Sarah Jean Peters',        5, null),
  ('Evalee Claire Ragar',      5, null),
  ('Stella Riding',            5, null),
  ('Kate Stucki',              5, null),
  ('Olivia Thornton',          5, null),
  ('Macy Marie Winder',        5, null)
on conflict (name) do nothing;

-- YW CLASS 3 — ages 16–18 (zone_id = 6)
insert into public.users (name, zone_id, mission) values
  ('Brooke Barton',           6, null),
  ('Ivy Bullock',             6, null),
  ('Anna Connors',            6, null),
  ('Lily Goodwin',            6, null),
  ('Brooklyn Gourley',        6, null),
  ('Maren Hamilton',          6, null),
  ('Jerzie Jerrae Mower',     6, null),
  ('Lily Adelaide Neish',     6, null),
  ('Macy Louise Neish',       6, null),
  ('Aidan Nibley',            6, null),
  ('Madeleine Sutton',        6, null),
  ('Nora Warnick',            6, null),
  ('Charlotte Williamson',    6, null),
  ('Lylah Grace Wobser',      6, null)
on conflict (name) do nothing;
