import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: "⚠️ Error Crítico: La variable de entorno 'SUPABASE_SERVICE_ROLE_KEY' no está configurada en los ajustes del proyecto (Settings). Las funciones del Super Administrador requieren esta clave para cargar los usuarios." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "admins") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*, parking_lots(name)")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "employees") {
       const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*, parking_lots(name)")
        .eq("role", "employee")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "devices") {
       const { data, error } = await supabaseAdmin
        .from("device_approvals")
        .select(`
          *,
          profiles!inner(email, role),
          parking_lots:parking_lot_id (name)
        `)
        .eq("profiles.role", "admin")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "pendingDevices") {
       const { data, error } = await supabaseAdmin
        .from("device_approvals")
        .select(`
          id,
          profiles!inner(role)
        `)
        .eq("status", "pending")
        .eq("profiles.role", "admin");
        
      if (error) throw error;
      return NextResponse.json({ success: true, data: data ? data.length : 0 });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
