import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parkingLotId = searchParams.get('id');

    if (!parkingLotId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (id)' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuración de base de datos incompleta' }, { status: 500 });
    }

    // Usar la autorización proveniente del header Authorization para validar la sesión
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Creamos cliente normal para verificar el token real del usuario
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

    // 1. Obtener el rol del usuario (solo superadmin puede eliminar parqueaderos)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Usuario no encontrado o no autorizado' }, { status: 401 });
    }

    if (profileData.role !== 'superadmin') {
      return NextResponse.json({ error: 'No tienes permisos para eliminar parqueaderos' }, { status: 403 });
    }

    // 2. Ejecutar la eliminación en Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('parking_lots')
      .delete()
      .eq('id', parkingLotId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Parqueadero eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error in /api/parking-lots/delete:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
