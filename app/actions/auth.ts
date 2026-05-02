"use server";

import { createClient } from "@supabase/supabase-js";

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
if (supabaseUrl === "undefined" || supabaseUrl === "null") supabaseUrl = "";

let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (supabaseServiceKey === "undefined" || supabaseServiceKey === "null") supabaseServiceKey = "";

// Ensure URL has protocol
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const FALLBACK_URL = "https://eicnazdxzkqlckpixhym.supabase.co";
const FALLBACK_SERVICE_KEY = "sb_secret_LJXPNHzU2oJ4vnUbS1c0Cg_ssjUo9nB";

const supabaseAdmin = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseServiceKey || FALLBACK_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function createUser(
  email: string,
  password: string,
  role: string,
  parkingLotId: string | null,
  customRoleId?: string
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: "Faltan las variables de entorno de Supabase (URL o Service Role Key) en el servidor." };
  }

  try {
    // 1. Create user in auth.users
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        throw new Error("El nombre de usuario ya está en uso. Por favor, elige otro.");
      }
      throw new Error(authError.message);
    }

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        role,
        parking_lot_id: parkingLotId,
        custom_role_id: customRoleId || null,
      });

    if (profileError) {
      // Rollback user creation if profile fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message);
    }

    return { success: true, user: authData.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
