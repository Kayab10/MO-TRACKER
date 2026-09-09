import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  URL && KEY ? createClient(URL, KEY, { realtime: { params: { eventsPerSecond: 2 } } }) : null;

/** True when Supabase env vars are configured — the app shares data across devices. */
export const cloudEnabled = !!supabase;

export type StateKey = 'dataset' | 'targets' | 'settings' | 'users';

const TABLE = 'app_state';

// Trips when the table/policies aren't set up yet — stops the app hammering a 404.
let schemaMissing = false;
export const cloudReady = () => cloudEnabled && !schemaMissing;
function note(err: { message: string; code?: string }) {
  if (/schema cache|does not exist|relation .* does not exist/i.test(err.message)) schemaMissing = true;
}

export type PullResult<T> =
  | { status: 'value'; value: T }
  | { status: 'empty' } // row confirmed absent — safe to clear locally
  | { status: 'error' }; // couldn't reach the cloud — do NOT touch local cache

/** Fetch one state blob. Distinguishes "genuinely empty" from "couldn't determine". */
export async function pull<T = unknown>(key: StateKey): Promise<PullResult<T>> {
  if (!cloudReady()) return { status: 'error' };
  try {
    const { data, error } = await supabase!.from(TABLE).select('value').eq('key', key).maybeSingle();
    if (error) {
      note(error);
      if (!schemaMissing) console.warn(`[cloud] pull ${key}: ${error.message}`);
      return { status: 'error' };
    }
    return data ? { status: 'value', value: data.value as T } : { status: 'empty' };
  } catch (e) {
    console.warn(`[cloud] pull ${key}:`, e);
    return { status: 'error' };
  }
}

/**
 * Write one state blob to the cloud (upsert), or DELETE the row when value is null/undefined
 * (e.g. admin removes the dataset). No-op (ok) when not configured.
 */
export async function push(key: StateKey, value: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!cloudEnabled) return { ok: true };
  if (schemaMissing) return { ok: false, error: 'Supabase table "app_state" not set up yet (run schema.sql)' };

  const op =
    value === null || value === undefined
      ? supabase!.from(TABLE).delete().eq('key', key)
      : supabase!.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  const { error } = await op;
  if (error) {
    note(error);
    console.warn(`[cloud] push ${key}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Subscribe to any change on app_state. `onChange` fires for every insert/update/delete
 * (DELETE payloads don't reliably carry the key, so callers should re-sync everything).
 * `onStatus` reports the channel state. Returns an unsubscribe fn.
 */
export function watch(
  onChange: () => void,
  onStatus?: (ok: boolean) => void,
): () => void {
  if (!supabase || schemaMissing) return () => {};
  const channel = supabase
    .channel('app_state_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => onChange())
    .subscribe((status) => onStatus?.(status === 'SUBSCRIBED'));
  return () => {
    supabase.removeChannel(channel);
  };
}
