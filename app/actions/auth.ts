"use server";

import { createClient } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/error";

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
    const { data: superadmins, error: saError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);

    if (saError) {
      return {
        success: false,
        error: "Error de base de datos verificando permisos.",
      };
    }

    const hasSuperadmin = superadmins && superadmins.length > 0;

    if (!hasSuperadmin) {
      if (role !== "superadmin") {
        return {
          success: false,
          error:
            "Creación no autorizada. Solo se puede inicializar un perfil de superadministrador.",
        };
      }
    } else {
      if (!token) {
        return { success: false, error: "No autorizado." };
      }

      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

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
        return {
          success: false,
          error: "No tienes permisos para crear usuarios.",
        };
      }

      if (profile.role === "admin") {
        if (profile.parking_lot_id !== parkingLotId) {
          return {
            success: false,
            error:
              "No tienes permisos para crear usuarios en este parqueadero.",
          };
        }
        if (role === "superadmin" || role === "admin") {
          return {
            success: false,
            error:
              "Los administradores no pueden crear usuarios con roles administrativos.",
          };
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
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteEmployee(userId: string, token: string) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: "Faltan variables de entorno en el servidor.",
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return { success: false, error: "Token inválido o expirado." };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, parking_lot_id")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      (profile.role !== "superadmin" && profile.role !== "admin")
    ) {
      return {
        success: false,
        error: "No tienes permisos para eliminar usuarios.",
      };
    }

    const { data: targetProfile, error: targetProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, parking_lot_id")
        .eq("id", userId)
        .single();

    if (targetProfileError || !targetProfile) {
      return { success: false, error: "El usuario objetivo no existe." };
    }

    // MEJORA 1: JERARQUÍA ESTRICTA PARA ELIMINAR USUARIOS
    // Regla 1: Validar que si el que elimina es admin, pertenezca al mismo parking_lot_id
    if (profile.role === "admin") {
      if (!profile.parking_lot_id || profile.parking_lot_id !== targetProfile.parking_lot_id) {
        return {
          success: false,
          error: "No tienes permisos sobre este usuario.",
        };
      }
      // Regla 2: Un admin SOLO puede eliminar a un employee
      if (targetProfile.role !== "employee") {
        return { success: false, error: "Los administradores solo pueden eliminar empleados." };
      }
    } else if (profile.role === "superadmin") {
      // Regla 3: Un superadmin SOLO puede eliminar a un admin
      if (targetProfile.role !== "admin") {
        return { success: false, error: "Los superadministradores solo pueden eliminar administradores." };
      }
    } else {
      return { success: false, error: "No tienes permisos para eliminar usuarios." };
    }

    // Limpieza previa manual antes de la eliminación del usuario
    // 1. Eliminar registros en admin_parking_lots donde admin_id === userId
    try {
      const { error } = await supabaseAdmin
        .from("admin_parking_lots")
        .delete()
        .eq("admin_id", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar admin_parking_lots para el usuario:", error);
    }

    // 2. Eliminar registros en device_approvals donde user_id === userId
    try {
      const { error } = await supabaseAdmin
        .from("device_approvals")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar device_approvals para el usuario:", error);
    }

    // 3. Actualizar cash_closures haciendo un update a { closed_by: null } donde closed_by === userId
    try {
      const { error } = await supabaseAdmin
        .from("cash_closures")
        .update({ closed_by: null })
        .eq("closed_by", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar cash_closures para el usuario:", error);
    }

    // 4. Actualizar cash_withdrawals haciendo un update a { withdrawn_by: null } donde withdrawn_by === userId
    try {
      const { error } = await supabaseAdmin
        .from("cash_withdrawals")
        .update({ withdrawn_by: null })
        .eq("withdrawn_by", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar cash_withdrawals para el usuario:", error);
    }

    // 5. Actualizar blacklisted_vehicles haciendo un update a { created_by: null } donde created_by === userId
    try {
      const { error } = await supabaseAdmin
        .from("blacklisted_vehicles")
        .update({ created_by: null })
        .eq("created_by", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar blacklisted_vehicles para el usuario:", error);
    }

    // 6. Actualizar vehicle_inspections haciendo un update a { employee_id: null } donde employee_id === userId
    try {
      const { error } = await supabaseAdmin
        .from("vehicle_inspections")
        .update({ employee_id: null })
        .eq("employee_id", userId);
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Error al limpiar vehicle_inspections para el usuario:", error);
    }

    // Regla 4: Ejecución usando supabaseAdmin (Service Role Key)
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDeleteError) throw profileDeleteError;

    // Retorna { success: true } si todo sale bien
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateEmployeePassword(
  userId: string,
  newPassword: string,
  token: string,
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: "Faltan variables de entorno en el servidor.",
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return { success: false, error: "Token inválido o expirado." };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, parking_lot_id")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      (profile.role !== "superadmin" && profile.role !== "admin")
    ) {
      return {
        success: false,
        error: "No tienes permisos para editar usuarios.",
      };
    }

    const { data: targetProfile, error: targetProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, parking_lot_id")
        .eq("id", userId)
        .single();

    if (targetProfileError || !targetProfile) {
      return { success: false, error: "El usuario objetivo no existe." };
    }

    // Authorization logic
    if (profile.role === "admin") {
      if (profile.parking_lot_id !== targetProfile.parking_lot_id) {
        return {
          success: false,
          error: "No tienes permisos sobre este usuario.",
        };
      }
      if (
        targetProfile.role === "admin" ||
        targetProfile.role === "superadmin"
      ) {
        return {
          success: false,
          error: "No puedes editar a un usuario con rol igual o superior.",
        };
      }
    } else if (profile.role === "superadmin") {
      if (targetProfile.role === "superadmin") {
        return {
          success: false,
          error: "No puedes editar a un superadministrador.",
        };
      }
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
    if (updateError) throw updateError;

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
