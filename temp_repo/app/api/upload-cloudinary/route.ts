import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    // El parámetro "image" se espera que sea un string base64 o un buffer compatible.
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'revistas',
      // Optimización automática dictada
      fetch_format: 'auto',
      quality: 'auto',
    });

    return NextResponse.json({
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    return NextResponse.json(
      { error: 'Hubo un error al subir la imagen' },
      { status: 500 }
    );
  }
}
