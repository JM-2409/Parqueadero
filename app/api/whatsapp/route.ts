import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// 1. Nombres correctos del .env y cero credenciales quemadas
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = 'whatsapp:+14155238886';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

export async function POST(req: Request) {
  try {
    const { to, mediaUrl, text } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Falta el número de destino' }, { status: 400 });
    }

    const client = twilio(twilioSid, twilioToken);
    
    let formattedTo = to.replace(/\D/g, '');
    if (!formattedTo.startsWith('57')) {
      formattedTo = '57' + formattedTo; 
    }
    const whatsappTo = `whatsapp:+${formattedTo}`;

    const messagePayload: any = {
      from: twilioPhone,
      to: whatsappTo,
      body: text || 'Su recibo de parqueadero adjunto.',
    };

    if (mediaUrl) {
      try {
        const { GET: generateImage } = await import('../receipt-image/route');
        const mockRequest = new Request(mediaUrl);
        const response = await generateImage(mockRequest);
        
        if (!response.ok) throw new Error(`Failed to generate image locally: ${response.status}`);
        
        // 2. Usar el ArrayBuffer directamente sin transformarlo
        const arrayBuffer = await response.arrayBuffer();
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin.storage.createBucket('receipts', { public: true }).catch(() => {});

          const fileName = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;

          // 3. Pasamos el arrayBuffer limpio a Supabase
          const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('receipts')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading image to Supabase:', uploadError);
            messagePayload.body += `\n\nEnlace del recibo: ${mediaUrl}`;
          } else {
            const { data: publicUrlData } = supabaseAdmin
              .storage
              .from('receipts')
              .getPublicUrl(fileName);
              
            messagePayload.mediaUrl = [publicUrlData.publicUrl];
            console.log('Imagen subida a Supabase, URL pública:', publicUrlData.publicUrl);
          }
        } else {
          messagePayload.body += `\n\nEnlace del recibo: ${mediaUrl}`;
        }
      } catch (uploadObjError) {
         console.error('Error in image generation or upload:', uploadObjError);
         messagePayload.body += `\n\nEnlace del recibo: ${mediaUrl}`;
      }
    }

    console.log('Enviando payload a Twilio:', messagePayload);
    const message = await client.messages.create(messagePayload);
    console.log('Mensaje aceptado por Twilio, SID:', message.sid);
    
    return NextResponse.json({ success: true, messageSid: message.sid, payload: messagePayload });
  } catch (error: any) {
    console.error('Twilio Error:', error);
    let errMsg = error.message || 'Error al enviar el mensaje por WhatsApp';
    errMsg = errMsg.replace(/https:\/\/api\.twilio\.com[^\s]*/g, '');
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
