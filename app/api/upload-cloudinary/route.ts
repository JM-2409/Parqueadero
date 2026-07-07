import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing supabaseUrl. Skipping execution.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Formato de imagen inválido' }, { status: 400 });
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const extension = type.split('/')[1] || 'jpg';
    
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('revistas')
      .upload(filename, buffer, {
        contentType: type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('revistas')
      .getPublicUrl(filename);

    return NextResponse.json({
      secure_url: publicUrlData.publicUrl,
      public_id: filename,
      format: extension,
      bytes: buffer.length,
    });
  } catch (error: unknown) {
    console.error('Error uploading to Supabase:', error);
    return NextResponse.json(
      { error: 'Hubo un error al subir la imagen' },
      { status: 500 }
    );
  }
}
