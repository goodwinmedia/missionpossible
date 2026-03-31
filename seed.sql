-- ============================================================
-- MISSION POSSIBLE — FRESH USER SEED
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- WARNING: Deletes ALL existing users and their entries.
-- ============================================================

-- Wipe everything (entries cascade via ON DELETE CASCADE)
DELETE FROM public.users;

-- ── DISTRICT 1  (Leader: Lincoln Goodwin · STL: Lily Neish) ──────────────────
INSERT INTO public.users (name, zone_id, mission, companion, district, district_role) VALUES
  ('Ivy Bullock',        4, '🇭🇷 Adriatic North',              'Charlotte Poll',     'District 1', null),
  ('Charlotte Poll',     6, '🇭🇷 Adriatic North',              'Ivy Bullock',        'District 1', null),
  ('Brennan Hamilton',   2, '🇦🇷 Argentina Buenos Aires South','Will Moss',          'District 1', null),
  ('Will Moss',          2, '🇦🇷 Argentina Buenos Aires South','Brennan Hamilton',   'District 1', null),
  ('Lylah Wobser',       4, '🇦🇺 Australia Brisbane',          'Clara Hansen',       'District 1', null),
  ('Clara Hansen',       5, '🇦🇺 Australia Brisbane',          'Lylah Wobser',       'District 1', null),
  ('Jerzie Mower',       4, '🇧🇪 Belgium/Netherlands',         'Stella Riding',      'District 1', null),
  ('Stella Riding',      5, '🇧🇪 Belgium/Netherlands',         'Jerzie Mower',       'District 1', null),
  ('Norah Thornton',     6, '🇧🇷 Brazil São Paulo North',      'Violet Egan',        'District 1', null),
  ('Violet Egan',        6, '🇧🇷 Brazil São Paulo North',      'Norah Thornton',     'District 1', null),
  ('Nora Warnick',       4, '🇧🇬 Bulgaria/Central Eurasian',   'Kate Hansen',        'District 1', null),
  ('Kate Hansen',        6, '🇧🇬 Bulgaria/Central Eurasian',   'Nora Warnick',       'District 1', null),
  ('Joe Egan',           3, '🇨🇦 Canada Montreal',             'Decklin Ragar',      'District 1', null),
  ('Decklin Ragar',      1, '🇨🇦 Canada Montreal',             'Joe Egan',           'District 1', null),
  ('James Riding',       3, '🇨🇱 Chile Santiago East',         'Oliver Gourley',     'District 1', null),
  ('Oliver Gourley',     2, '🇨🇱 Chile Santiago East',         'James Riding',       'District 1', null),
  ('Kate Stucki',        5, '🇵🇭 Philippines Manila',          'Emma Moss',          'District 1', null),
  ('Emma Moss',          6, '🇵🇭 Philippines Manila',          'Kate Stucki',        'District 1', null),
  ('Lincoln Goodwin',    3, '🇩🇴 Dominican Republic',          'Jude Gourley',       'District 1', 'leader'),
  ('Jude Gourley',       1, '🇩🇴 Dominican Republic',          'Lincoln Goodwin',    'District 1', null),
  ('Lily Neish',         4, '🇮🇹 Italy Milan',                 'Hailey Nehren',      'District 1', 'stl'),
  ('Hailey Nehren',      6, '🇮🇹 Italy Milan',                 'Lily Neish',         'District 1', null);

-- ── DISTRICT 2  (Leader: Max Neish · STL: Emily Stucki) ──────────────────────
INSERT INTO public.users (name, zone_id, mission, companion, district, district_role) VALUES
  ('Brooklyn Gourley',   4, '🇪🇨 Ecuador Quito South',        'Olivia Thornton',    'District 2', null),
  ('Olivia Thornton',    5, '🇪🇨 Ecuador Quito South',        'Brooklyn Gourley',   'District 2', null),
  ('Max Neish',          3, '🇬🇧 England Bristol',            'Will Winder',        'District 2', 'leader'),
  ('Will Winder',        1, '🇬🇧 England Bristol',            'Max Neish',          'District 2', null),
  ('Evalee Ragar',       5, '🇫🇮 Finland Helsinki',           'Skye Pritchett',     'District 2', null),
  ('Skye Pritchett',     6, '🇫🇮 Finland Helsinki',           'Evalee Ragar',       'District 2', null),
  ('Corban Livingston',  3, '🇫🇷 France Lyon',                'Mason Nehren',       'District 2', null),
  ('Mason Nehren',       2, '🇫🇷 France Lyon',                'Corban Livingston',  'District 2', null),
  ('Adam Brown',         3, '🇩🇪 Germany Hamburg',            'Dane Goodwin',       'District 2', null),
  ('Dane Goodwin',       2, '🇩🇪 Germany Hamburg',            'Adam Brown',         'District 2', null),
  ('Lanie Sutton',       4, '🇬🇹 Guatemala Antigua',          'Elle McFarlane',     'District 2', null),
  ('Elle McFarlane',     5, '🇬🇹 Guatemala Antigua',          'Lanie Sutton',       'District 2', null),
  ('Lauren Robinson',    4, '🇺🇸 Honolulu Hawaii',            'Emily Stucki',       'District 2', null),
  ('Emily Stucki',       4, '🇺🇸 Honolulu Hawaii',            'Lauren Robinson',    'District 2', 'stl'),
  ('Ethan Robinson',     3, '🇯🇵 Japan Sendai',               'Max Barclay',        'District 2', null),
  ('Max Barclay',        2, '🇯🇵 Japan Sendai',               'Ethan Robinson',     'District 2', null),
  ('Dan Egan',           3, '🇯🇵 Japan Sendai',               'Ethan Robinson',     'District 2', null),
  ('Emma Beauchene',     5, '🇰🇷 Korea Seoul',                'Macy Winder',        'District 2', null),
  ('Macy Winder',        5, '🇰🇷 Korea Seoul',                'Emma Beauchene',     'District 2', null),
  ('Seth Gourley',       3, '🇳🇿 New Zealand Wellington',     'Asher Jacobsen',     'District 2', null),
  ('Asher Jacobsen',     1, '🇳🇿 New Zealand Wellington',     'Seth Gourley',       'District 2', null);

-- ── DISTRICT 3  (Leader: CJ Gibson · STL: Anna Connors) ──────────────────────
INSERT INTO public.users (name, zone_id, mission, companion, district, district_role) VALUES
  ('Dylan Beauchene',    3, '🇳🇴 Norway Oslo',                'Will Jepsen',        'District 3', null),
  ('Will Jepsen',        1, '🇳🇴 Norway Oslo',                'Dylan Beauchene',    'District 3', null),
  ('Macy Neish',         4, '🇵🇭 Philippines Naga',           'Sarah Peters',       'District 3', null),
  ('Sarah Peters',       5, '🇵🇭 Philippines Naga',           'Macy Neish',         'District 3', null),
  ('Lauren Bunker',      4, '🇵🇹 Portugal Lisbon',            'Charlotte Jacobsen', 'District 3', null),
  ('Charlotte Jacobsen', 5, '🇵🇹 Portugal Lisbon',            'Lauren Bunker',      'District 3', null),
  ('Aidan Nibley',       4, '🇷🇴 Romania Bucharest',          'Bree Hansen',        'District 3', null),
  ('Bree Hansen',        5, '🇷🇴 Romania Bucharest',          'Aidan Nibley',       'District 3', null),
  ('Kai Nehren',         3, '🇷🇺 Russia Moscow',              'Hudson Poll',        'District 3', null),
  ('Hudson Poll',        2, '🇷🇺 Russia Moscow',              'Kai Nehren',         'District 3', null),
  ('Camden Strong',      3, '🇬🇧 Scotland/Ireland',           'Mason McFarlane',    'District 3', null),
  ('Mason McFarlane',    1, '🇬🇧 Scotland/Ireland',           'Camden Strong',      'District 3', null),
  ('Lily Goodwin',       4, '🇿🇦 South Africa Cape Town',     'Emma Peters',        'District 3', null),
  ('Emma Peters',        5, '🇿🇦 South Africa Cape Town',     'Lily Goodwin',       'District 3', null),
  ('Brady Bunker',       2, '🇹🇼 Taiwan Taipei',              'Taylor Goodwin',     'District 3', null),
  ('Taylor Goodwin',     1, '🇹🇼 Taiwan Taipei',              'Brady Bunker',       'District 3', null),
  ('Anna Connors',       4, '🇸🇪 Sweden Stockholm',           'Norah Gardner',      'District 3', 'stl'),
  ('Norah Gardner',      6, '🇸🇪 Sweden Stockholm',           'Anna Connors',       'District 3', null),
  ('CJ Gibson',          3, '🇪🇸 Spain Barcelona',            'Miles Barclay',      'District 3', 'leader'),
  ('Miles Barclay',      1, '🇪🇸 Spain Barcelona',            'CJ Gibson',          'District 3', null),
  ('Maren Hamilton',     4, '🇻🇪 Venezuela Caracas',          'Brylie Mower',       'District 3', null),
  ('Brylie Mower',       5, '🇻🇪 Venezuela Caracas',          'Maren Hamilton',     'District 3', null);

-- ── UNASSIGNED (no mission · no companion · no district) ─────────────────────
INSERT INTO public.users (name, zone_id, mission, companion, district, district_role) VALUES
  ('Josh Bavaro',          3, null, null, null, null),
  ('Josh Peang',           3, null, null, null, null),
  ('Ryder Zumwalt',        3, null, null, null, null),
  ('Deklan Bavaro',        2, null, null, null, null),
  ('Tristan Bavaro',       2, null, null, null, null),
  ('Connor Dimond',        1, null, null, null, null),
  ('Charlotte Williamson', 4, null, null, null, null),
  ('Brooke Barton',        4, null, null, null, null),
  ('Swayzie King',         5, null, null, null, null);
