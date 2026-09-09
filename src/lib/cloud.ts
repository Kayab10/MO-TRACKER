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

/** Fetch one state blob from the cloud. Returns undefined if not configured, missing, or on error. */
export async function pull<T = unknown>(key: StateKey): Promise<T | undefined> {
  if (!cloudReady()) return undefined;
  const { data, error } = await supabase!.from(TABLE).select('value').eq('key', key).maybeSingle();
  if (error) {
    note(error);
    if (!schemaMissing) console.warn(`[cloud] pull ${key}: ${error.message}`);
    return undefined;
  }
  return (data?.value as T) ?? undefined;
}

/** Write one state blob to the cloud. No-op (ok) when not configured. */
export async function push(key: StateKey, value: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!cloudEnabled) return { ok: true };
  if (schemaMissing) return { ok: false, error: 'Supabase table "app_state" not set up yet (run schema.sql)' };
  const { error } = await supabase!
    .from(TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) {
    note(error);
    console.warn(`[cloud] push ${key}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Subscribe to any change on app_state. Calls onChange(key) for each. Returns an unsubscribe fn. */
export function watch(onChange: (key: StateKey) => void): () => void {
  if (!supabase || schemaMissing) return () => {};
  const channel = supabase
    .channel('app_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        const rec = (payload.new ?? payload.old) as { key?: StateKey } | null;
        if (rec?.key) onChange(rec.key);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
