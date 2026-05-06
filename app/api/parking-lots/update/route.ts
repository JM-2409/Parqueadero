import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { parkingLotId, updateData } = body;

    if (!parkingLotId || !updateData) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuración de base de datos incompleta' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey, {
      global: {
         headers: {
            Authorization: authHeader
         }
      }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    const userId = user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verificar rol y parqueadero
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, parking_lot_id')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Usuario no encontrado o no autorizado' }, { status: 401 });
    }

    const role = profileData.role;

    if (role === 'admin') {
      if (profileData.parking_lot_id !== parkingLotId) {
        return NextResponse.json({ error: 'No tienes permisos para editar este parqueadero' }, { status: 403 });
      }
    } else if (role !== 'superadmin') {
      return NextResponse.json({ error: 'No tienes permisos para actualizar parqueaderos' }, { status: 403 });
    }

    // 2. Filtrar campos usando un AllowList según el rol
    let safeUpdateData: any = {};

    if (role === 'admin') {
      const allowedKeys = [
        'capacity', 'show_revenue', 'allowed_vehicles', 'custom_fields',
        'private_custom_fields', 'settings', 'entry_grace_period_mins', 'shift_grace_period_mins'
      ];
      for (const key of allowedKeys) {
        if (updateData[key] !== undefined) {
          safeUpdateData[key] = updateData[key];
        }
      }
    } else if (role === 'superadmin') {
      const allowedKeys = [
        'name', 'nit', 'address', 'features', 'is_active', 'is_suspended', 'subscription_end_date'
      ];
      for (const key of allowedKeys) {
        if (updateData[key] !== undefined) {
          safeUpdateData[key] = updateData[key];
        }
      }
    }

    if (Object.keys(safeUpdateData).length === 0) {
      return NextResponse.json({ success: true, message: 'No hay campos permitidos para actualizar' });
    }

    // 3. Ejecutar actualización
    const { data, error: updateError } = await supabaseAdmin
      .from('parking_lots')
      .update(safeUpdateData)
      .eq('id', parkingLotId)
      .select();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in /api/parking-lots/update:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
