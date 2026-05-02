import { createClient } from "@supabase/supabase-js";

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
if (supabaseUrl === "undefined" || supabaseUrl === "null") supabaseUrl = "";

let supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
if (supabaseAnonKey === "undefined" || supabaseAnonKey === "null") supabaseAnonKey = "";

// Ensure URL has protocol
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseUrl !== 'https://placeholder.supabase.co';

const FALLBACK_URL = "https://eicnazdxzkqlckpixhym.supabase.co";

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
