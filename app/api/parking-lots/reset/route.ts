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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

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
    const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)$/i);
    if (!bearerMatch) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!anonKey) {
      return NextResponse.json(
        { error: "Configuración de autenticación incompleta" },
        { status: 500 },
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerMatch[1]}`,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(bearerMatch[1]);

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

    const { data: resetResult, error: resetError } = await supabaseAdmin.rpc(
      "reset_parking_lot_data",
      { p_parking_lot_id: parkingLotId },
    );

    if (resetError) {
      console.error("Error resetting parking lot:", resetError);
      return NextResponse.json(
        { error: "No se pudieron reiniciar todos los datos del parqueadero." },
        { status: 500 },
      );
    }

    if (!resetResult?.success) {
      console.error("Parking lot reset failed:", resetResult?.error);
      return NextResponse.json(
        { error: resetResult?.error || "No se pudieron reiniciar los datos." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: resetResult.message || "Los datos se reiniciaron correctamente.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/parking-lots/reset:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Error interno del servidor" },
      { status: 500 },
    );
  }
}
