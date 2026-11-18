import { createClient } from "@supabase/supabase-js";

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
if (supabaseUrl === "undefined" || supabaseUrl === "null") supabaseUrl = "";

let supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
if (supabaseAnonKey === "undefined" || supabaseAnonKey === "null") supabaseAnonKey = "";

// Ensure URL has protocol
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseUrl !== "https://placeholder.supabase.co" &&
  supabaseAnonKey.length > 0 &&
  supabaseAnonKey !== "placeholder_key";

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key'
);
