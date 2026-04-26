import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SCORING_WINDOW_START, SCORING_WINDOW_END } from './config.js';

let _client = null;

export function getClient() {
  if (!_client) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') throw new Error('CONFIG_MISSING');
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

// ── CUSTOM HABITS ─────────────────────────────────────────────────────────────

export async function getCustomHabits() {
  const { data, error } = await getClient().from('custom_habits').select('*').eq('active', true).order('created_at');
  if (error) throw error;
  return data;
}

export async function addCustomHabit(habit) {
  const { data, error } = await getClient().from('custom_habits').insert(habit).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomHabit(id) {
  const { error } = await getClient().from('custom_habits').delete().eq('id', id);
  if (error) throw error;
}

// ── ZONES ─────────────────────────────────────────────────────────────────────

export async function getZonesWithStatus() {
  const { data, error } = await getClient().from('zones').select('*').order('id');
  if (error) throw error;
  return data;
}

export async function setZoneActive(id, active) {
  const { error } = await getClient().from('zones').update({ active }).eq('id', id);
  if (error) throw error;
}

// ── USERS ────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const { data, error } = await getClient().from('users').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createUser(name, zone_id, mission = null) {
  const { data, error } = await getClient()
    .from('users').insert({ name: name.trim(), zone_id, mission }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateUserZone(userId, zone_id) {
  const { error } = await getClient().from('users').update({ zone_id }).eq('id', userId);
  if (error) throw error;
}

export async function updateUserName(userId, name) {
  const { error } = await getClient().from('users').update({ name: name.trim() }).eq('id', userId);
  if (error) throw error;
}

export async function updateUserMission(userId, mission) {
  const { error } = await getClient().from('users').update({ mission }).eq('id', userId);
  if (error) throw error;
}

export async function adminDeleteUser(userId) {
  const { error } = await getClient().from('users').delete().eq('id', userId);
  if (error) throw error;
}

// ── ENTRIES ──────────────────────────────────────────────────────────────────
// PostgREST/Supabase returns at most ~1000 rows per request by default. Leaderboard
// totals sum all rows — without paging, only the newest 1000 entries globally are
// loaded, so users' scores on the board can be far below their profile total.

const ENTRIES_PAGE_SIZE = 1000;

export async function getEntriesForUser(userId) {
  const client = getClient();
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(from, from + ENTRIES_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < ENTRIES_PAGE_SIZE) break;
    from += ENTRIES_PAGE_SIZE;
  }
  return all;
}

export async function getAllEntries() {
  const client = getClient();
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from('entries')
      .select('*, users!inner(name, zone_id)')
      .order('date', { ascending: false })
      .range(from, from + ENTRIES_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < ENTRIES_PAGE_SIZE) break;
    from += ENTRIES_PAGE_SIZE;
  }
  return all;
}

/** One row per user server-side. Sums only entries inside the scoring window
 *  so back-dated completions outside the window don't inflate the leaderboard.
 *  If the RPC is missing, falls back to summing entry rows client-side with
 *  the same date filter. */
export async function getEntryTotalsByUser() {
  const { data, error } = await getClient().rpc('entry_totals_by_user', {
    p_start: SCORING_WINDOW_START,
    p_end:   SCORING_WINDOW_END,
  });
  if (!error && Array.isArray(data)) {
    const map = {};
    for (const row of data) {
      map[row.user_id] = Number(row.total_points) || 0;
    }
    return map;
  }
  const entries = await getAllEntries();
  const map = {};
  for (const e of entries) {
    if (e.date < SCORING_WINDOW_START || e.date > SCORING_WINDOW_END) continue;
    map[e.user_id] = (map[e.user_id] || 0) + e.points;
  }
  return map;
}

export async function addEntry(entry) {
  const { data, error } = await getClient()
    .from('entries').insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(userId, habitId, date) {
  const { error } = await getClient()
    .from('entries').delete()
    .eq('user_id', userId).eq('habit_id', habitId).eq('date', date);
  if (error) throw error;
}

export async function batchUpsertEntries(entries) {
  const { error } = await getClient()
    .from('entries').upsert(entries, { onConflict: 'user_id,habit_id,date', ignoreDuplicates: false });
  if (error) throw error;
}

export async function deleteEntriesByIds(ids) {
  if (!ids.length) return;
  const { error } = await getClient().from('entries').delete().in('id', ids);
  if (error) throw error;
}

export async function adminDeleteEntry(entryId) {
  const { error } = await getClient().from('entries').delete().eq('id', entryId);
  if (error) throw error;
}

// ── REALTIME ─────────────────────────────────────────────────────────────────

export function subscribeToEntries(callback) {
  return getClient()
    .channel('entries-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, callback)
    .subscribe();
}
