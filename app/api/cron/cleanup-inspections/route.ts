import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getErrorMessage } from "@/lib/error";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl) {
      console.warn("supabaseUrl is missing, skipping cron execution");
      return NextResponse.json({ message: 'Missing supabaseUrl. Skipping execution.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

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
    const allFilenamesToDelete: string[] = [];

    for (const inspection of oldInspections) {
      idsToDelete.push(inspection.id);

      const images: string[] = inspection.images || [];

      for (const imageUrl of images) {
        try {
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          if (filename) {
            allFilenamesToDelete.push(filename);
          }
        } catch(e) {
          console.error(`Fallo al extraer el filename de la URL ${imageUrl}:`, e);
        }
      }
    }

    // Procesar borrado de imágenes en lotes en paralelo para evitar retrasos secuenciales por I/O
    if (allFilenamesToDelete.length > 0) {
      const BATCH_SIZE = 100;
      const batches: string[][] = [];
      for (let i = 0; i < allFilenamesToDelete.length; i += BATCH_SIZE) {
        batches.push(allFilenamesToDelete.slice(i, i + BATCH_SIZE));
      }

      // Concurrency limit to prevent overwhelming Supabase
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
        const batchSlice = batches.slice(i, i + CONCURRENCY_LIMIT);

        const results = await Promise.all(
          batchSlice.map(async (batch, index) => {
            const absoluteIndex = i + index;
            try {
              const { error } = await supabaseAdmin.storage.from('revistas').remove(batch);
              if (!error) {
                return batch.length;
              } else {
                console.error(`Fallo al borrar imágenes en Supabase para el lote (index ${absoluteIndex}):`, error);
                return 0;
              }
            } catch(e) {
              console.error(`Fallo al borrar imágenes en Supabase para el lote (index ${absoluteIndex}):`, e);
              return 0;
            }
          })
        );

        deletedImagesCount += results.reduce((sum, count) => sum + count, 0);
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
  } catch (error: unknown) {
    console.error('Error cleaning up inspections:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
