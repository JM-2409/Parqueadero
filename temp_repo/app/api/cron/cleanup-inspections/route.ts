import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function GET(request: Request) {
  try {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 15);
    const limitDateISO = limitDate.toISOString();

    const { data: oldInspections, error: fetchError } = await supabase
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
      for (const imageUrl of images) {
        try {
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const filenameWithoutExt = filename.split('.')[0];
          const publicId = `revistas/${filenameWithoutExt}`;

          await cloudinary.uploader.destroy(publicId);
          deletedImagesCount++;
        } catch(e) {
          console.error(`Fallo al borrar imagen de cloudinary ${imageUrl}:`, e);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('vehicle_inspections')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: `Limpieza completada. ${idsToDelete.length} revistas eliminadas. ${deletedImagesCount} fotos borradas de Cloudinary.`,
    });
  } catch (error: any) {
    console.error('Error cleaning up inspections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
