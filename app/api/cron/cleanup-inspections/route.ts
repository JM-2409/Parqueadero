import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET(request: Request) {
  try {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);
    const limitDateISO = limitDate.toISOString();

    const { data: oldInspections, error: fetchError } = await supabaseAdmin
      .from('vehicle_inspections')
      .select('id, images')
      .lt('created_at', limitDateISO);

    if (fetchError) throw fetchError;

    if (!oldInspections || oldInspections.length === 0) {
      return NextResponse.json({ message: 'No hay revistas viejas para limpiar.' });
    }

    let deletedImagesCount = 0;
    const idsToDelete: string[] = [];

    for (const inspection of oldInspections) {
      idsToDelete.push(inspection.id);

      const images: string[] = inspection.images || [];
      const filenamesToDelete: string[] = [];

      for (const imageUrl of images) {
        try {
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          if (filename) {
            filenamesToDelete.push(filename);
          }
        } catch(e) {
          console.error(`Fallo al extraer el filename de la URL ${imageUrl}:`, e);
        }
      }

      if (filenamesToDelete.length > 0) {
        try {
          const { error } = await supabaseAdmin.storage.from('revistas').remove(filenamesToDelete);
          if (!error) {
           deletedImagesCount += filenamesToDelete.length;
          } else {
           console.error(`Fallo al borrar imágenes en Supabase:`, error);
          }
        } catch(e) {
          console.error(`Fallo al borrar imágenes en Supabase:`, e);
        }
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('vehicle_inspections')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: `Limpieza completada. ${idsToDelete.length} revistas eliminadas. ${deletedImagesCount} fotos borradas del almacenamiento.`,
    });
  } catch (error: any) {
    console.error('Error cleaning up inspections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
