"use server";

import { createClient } from "@supabase/supabase-js";

let supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
if (supabaseUrl === "undefined" || supabaseUrl === "null") supabaseUrl = "";

let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (supabaseServiceKey === "undefined" || supabaseServiceKey === "null")
  supabaseServiceKey = "";

// Ensure URL has protocol
if (supabaseUrl && !supabaseUrl.startsWith("http")) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder_key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function createUser(
  email: string,
  password: string,
  role: string,
  parkingLotId: string | null,
  customRoleId?: string,
  token?: string,
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error:
        "Faltan las variables de entorno de Supabase (URL o Service Role Key) en el servidor.",
    };
  }

  try {
    // Auth Validation (Security Fix)
    const { data: superadmins, error: saError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);

    if (saError) {
      return { success: false, error: "Error de base de datos verificando permisos." };
    }

    const hasSuperadmin = superadmins && superadmins.length > 0;

    if (hasSuperadmin) {
      if (!token) {
        return { success: false, error: "No autorizado." };
      }

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return { success: false, error: "Token inválido o expirado." };
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role, parking_lot_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: "Usuario no autorizado." };
      }

      if (profile.role !== "superadmin" && profile.role !== "admin") {
        return { success: false, error: "No tienes permisos para crear usuarios." };
      }

      if (profile.role === "admin") {
        if (profile.parking_lot_id !== parkingLotId) {
          return { success: false, error: "No tienes permisos para crear usuarios en este parqueadero." };
        }
        if (role === "superadmin" || role === "admin") {
          return { success: false, error: "Los administradores no pueden crear usuarios con roles administrativos." };
        }
      }
    }

    // 1. Create user in auth.users
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message.includes("already registered") ||
        authError.message.includes("already exists")
      ) {
        throw new Error(
          "El nombre de usuario ya está en uso. Por favor, elige otro.",
        );
      }
      throw new Error(authError.message);
    }

    // 2. Create profile
    const profilePayload: Record<string, any> = {
      id: authData.user.id,
      email,
      role,
      parking_lot_id: parkingLotId,
    };
    if (customRoleId) {
      profilePayload.custom_role_id = customRoleId;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profilePayload);

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
