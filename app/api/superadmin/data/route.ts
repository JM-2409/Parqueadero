import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getErrorMessage } from "@/lib/error";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const authHeader = req.headers.get('authorization');
    const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)$/i);

    if (!bearerMatch) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Configuración de base de datos incompleta' },
        { status: 500 },
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(bearerMatch[1]);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Sesión inválida o vencida' },
        { status: 401 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile?.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos de superadministrador' },
        { status: 403 },
      );
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
  } catch (error: unknown) {
    console.error('Error in /api/superadmin/data:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
