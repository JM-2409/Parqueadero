"use server";

import { createClient } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/error";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function deleteParkingSession(sessionId: string, token: string) {
  try {
    // 1. Get user profile to check permissions
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error("No autorizado.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, parking_lot_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      throw new Error("Permisos insuficientes.");
    }

    // 2. Fetch the session to be deleted
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("parking_sessions")
      .select("receipt_number, parking_lot_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Sesión no encontrada.");
    }

    // Ensure admin is deleting from their own parking lot
    if (profile.parking_lot_id !== session.parking_lot_id) {
        throw new Error("No autorizado para este parqueadero.");
    }

    // 3. Get current receipt_sequence
    const { data: parkingLot, error: lotError } = await supabaseAdmin
      .from("parking_lots")
      .select("receipt_sequence")
      .eq("id", session.parking_lot_id)
      .single();

    if (lotError || !parkingLot) {
      throw new Error("Parqueadero no encontrado.");
    }

    // 4. Delete the session
    const { error: deleteError } = await supabaseAdmin
      .from("parking_sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      throw deleteError;
    }

    // 5. Update receipt_sequence if the deleted receipt was the last one
    if (session.receipt_number === parkingLot.receipt_sequence) {
      const { error: updateLotError } = await supabaseAdmin
        .from("parking_lots")
        .update({ receipt_sequence: parkingLot.receipt_sequence - 1 })
        .eq("id", session.parking_lot_id);

      if (updateLotError) {
        console.error("Error actualizando receipt_sequence:", updateLotError);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error al eliminar la sesión de parqueo:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
