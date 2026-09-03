import type { SupabaseClient } from '@supabase/supabase-js'
import type { Entry } from './schemas'
import type { FoodHint } from './prompt'
import { dayRange } from './time'

export type EntryRow = Entry & { id: string; raw_input_id: string | null; created_at: string }
export type RawInput = { text: string; source: 'voice' | 'form'; reference_at: string; pasted_json: unknown }
export type RankingRow = {
  candidate: string; grp: string; exposed_n: number; exposed_hits: number
  control_n: number; control_hits: number; ratio: number | null; enough: boolean
}
export type DetailRow = { exposure_id: string; exposure_at: string; hit: boolean; target_id: string | null; target_at: string | null }

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export async function getProfile(sb: SupabaseClient) {
  const row = must(await sb.from('profiles').select('user_id, display_name, timezone').maybeSingle()) as
    { user_id: string; display_name: string | null; timezone: string } | null
  if (!row) throw new Error('profile_missing')
  return row
}

export async function listEntriesForDay(sb: SupabaseClient, dateStr: string, tz: string): Promise<EntryRow[]> {
  const { from, to } = dayRange(dateStr, tz)
  return must(await sb.from('entries')
    .select('id, raw_input_id, kind, occurred_at, time_precision, source_text, data, created_at')
    .is('deleted_at', null).gte('occurred_at', from).lte('occurred_at', to)
    .order('occurred_at', { ascending: true })) as EntryRow[]
}

export async function getEntry(sb: SupabaseClient, id: string): Promise<EntryRow | null> {
  const r = await sb.from('entries').select('id, raw_input_id, kind, occurred_at, time_precision, source_text, data, created_at')
    .eq('id', id).is('deleted_at', null).maybeSingle()
  if (r.error) throw new Error(r.error.message)
  return r.data as EntryRow | null
}

export async function updateEntry(sb: SupabaseClient, id: string,
  patch: { occurred_at?: string; time_precision?: Entry['time_precision']; data?: Entry['data'] }) {
  const rows = must(await sb.from('entries').update(patch).eq('id', id).select('id')) as { id: string }[]
  if (rows.length === 0) throw new Error('not_found')
  if (patch.data && 'foods' in patch.data) {
    const tags = patch.data.foods.flatMap((f) => f.ingredients)
    must(await sb.from('entry_tags').delete().eq('entry_id', id))
    if (tags.length) must(await sb.from('entry_tags').insert([...new Set(tags)].map((tag) => ({ entry_id: id, tag }))))
  }
}

export async function deleteEntry(sb: SupabaseClient, id: string) {
  const rows = must(await sb.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id')) as { id: string }[]
  if (rows.length === 0) throw new Error('not_found')
}

export async function getRawInput(sb: SupabaseClient, id: string) {
  const r = await sb.from('raw_inputs').select('text').eq('id', id).maybeSingle()
  if (r.error) throw new Error(r.error.message)
  return r.data as { text: string } | null
}

export async function saveEntries(sb: SupabaseClient, raw: RawInput | null, entries: Entry[]): Promise<string[]> {
  return must(await sb.rpc('save_entries', { p_raw: raw, p_entries: entries })) as string[]
}

export async function listFoods(sb: SupabaseClient, limit = 50): Promise<FoodHint[]> {
  return must(await sb.from('foods').select('name, ingredients').order('last_used_at', { ascending: false }).limit(limit)) as FoodHint[]
}

export async function suspectRanking(sb: SupabaseClient, a: { from: string; to: string; windowHours: number; target: string }): Promise<RankingRow[]> {
  return must(await sb.rpc('suspect_ranking', { p_from: a.from, p_to: a.to, p_window_hours: a.windowHours, p_target: a.target })) as RankingRow[]
}

export async function suspectDetail(sb: SupabaseClient, a: { from: string; to: string; windowHours: number; target: string; grp: string; candidate: string }): Promise<DetailRow[]> {
  return must(await sb.rpc('suspect_detail', {
    p_from: a.from, p_to: a.to, p_window_hours: a.windowHours, p_target: a.target, p_grp: a.grp, p_candidate: a.candidate,
  })) as DetailRow[]
}

export async function listInvites(sb: SupabaseClient) {
  return must(await sb.from('invites').select('email, created_at').order('created_at', { ascending: false })) as { email: string; created_at: string }[]
}

export async function addInvite(sb: SupabaseClient, email: string, invitedBy: string) {
  must(await sb.from('invites').insert({ email: email.trim().toLowerCase(), invited_by: invitedBy }).select('email'))
}

export async function updateTimezone(sb: SupabaseClient, userId: string, tz: string) {
  const rows = must(await sb.from('profiles').update({ timezone: tz }).eq('user_id', userId).select('user_id')) as { user_id: string }[]
  if (rows.length === 0) throw new Error('not_found')
}

export async function exportRows(sb: SupabaseClient, from: string, to: string): Promise<EntryRow[]> {
  return must(await sb.from('entries')
    .select('id, raw_input_id, kind, occurred_at, time_precision, source_text, data, created_at')
    .is('deleted_at', null).gte('occurred_at', from).lte('occurred_at', to)
    .order('occurred_at', { ascending: true })) as EntryRow[]
}
