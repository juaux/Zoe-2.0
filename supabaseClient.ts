import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes no .env.local');
}

declare global {
  var _supabaseInstance: SupabaseClient | undefined;
}

function getSupabaseClient(): SupabaseClient {
  if (globalThis._supabaseInstance) return globalThis._supabaseInstance;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    db: { schema: 'public' },
    realtime: { params: { eventsPerSecond: 2 } },
  });

  globalThis._supabaseInstance = client;
  return client;
}

export const supabase = getSupabaseClient();
