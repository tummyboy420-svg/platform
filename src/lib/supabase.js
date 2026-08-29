import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = !!(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseEnv ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Ghost client that does NOT persist session. 
// Used by admins to create users without logging themselves out.
export const adminAuthClient = hasSupabaseEnv ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
}) : null;
