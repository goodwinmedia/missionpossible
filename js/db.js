import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let _client = null;

export function getClient() {
  if (!_client) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') throw new Error('CONFIG_MISSING');
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
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

export async function adminDeleteUser(userId) {
  const { error } = await getClient().from('users').delete().eq('id', userId);
  if (error) throw error;
}

// ── ENTRIES ──────────────────────────────────────────────────────────────────

export async function getEntriesForUser(userId) {
  const { data, error } = await getClient()
    .from('entries').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllEntries() {
  const { data, error } = await getClient()
    .from('entries').select('*, users!inner(name, zone_id)').order('date', { ascending: false });
  if (error) throw error;
  return data;
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
