import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/error";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ""
    ).trim();
    const supabaseServiceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ""
    ).trim();

    const body = await req.json();
    const { parkingLotId } = body;

    if (!parkingLotId) {
      return NextResponse.json(
        { error: "El parámetro parkingLotId es requerido" },
        { status: 400 },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Configuración de base de datos incompleta" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData || profileData.role !== "superadmin") {
      return NextResponse.json(
        { error: "No tienes permisos de súper administrador" },
        { status: 403 },
      );
    }

    // 1. Delete parking sessions
    const { error: sessionError } = await supabaseAdmin
      .from("parking_sessions")
      .delete()
      .eq("parking_lot_id", parkingLotId);

    if (sessionError) {
      console.error("Error deleting parking sessions:", sessionError);
    }

    // 2. Delete cash withdrawals
    const { error: withdrawalError } = await supabaseAdmin
      .from("cash_withdrawals")
      .delete()
      .eq("parking_lot_id", parkingLotId);

    if (withdrawalError) {
      console.error("Error deleting cash withdrawals:", withdrawalError);
    }

    // 3. Delete cash closures
    const { error: closureError } = await supabaseAdmin
      .from("cash_closures")
      .delete()
      .eq("parking_lot_id", parkingLotId);

    if (closureError) {
      console.error("Error deleting cash closures:", closureError);
    }

    // 4. Delete private parking spaces
    const { error: privateSpacesError } = await supabaseAdmin
      .from("private_parking_spaces")
      .delete()
      .eq("parking_lot_id", parkingLotId);

    if (privateSpacesError) {
      console.error("Error deleting private parking spaces:", privateSpacesError);
    }

    // 5. Delete vehicle inspections
    const { error: inspectionsError } = await supabaseAdmin
      .from("vehicle_inspections")
      .delete()
      .eq("parking_lot_id", parkingLotId);

    if (inspectionsError) {
      console.error("Error deleting vehicle inspections:", inspectionsError);
    }

    // 6. Reset receipt sequence to 0
    const { error: resetSeqError } = await supabaseAdmin
      .from("parking_lots")
      .update({ receipt_sequence: 0 })
      .eq("id", parkingLotId);

    if (resetSeqError) {
      console.error("Error resetting receipt sequence:", resetSeqError);
    }

    return NextResponse.json({
      success: true,
      message: "Todos los datos operativos del parqueadero se reiniciaron correctamente.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/parking-lots/reset:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Error interno del servidor" },
      { status: 500 },
    );
  }
}
