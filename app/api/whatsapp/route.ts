import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/error";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Nombres correctos del .env y cero credenciales quemadas
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    let supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ""
    ).trim();
    let supabaseServiceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ""
    ).trim();

    // Validación estricta de credenciales de Twilio
    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.error(
        "Error: Credenciales de Twilio no configuradas en las variables de entorno.",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Configuración de servidor incompleta para el envío de WhatsApp.",
        },
        { status: 500 },
      );
    }

    const { to, mediaUrl, text, parkingLotId } = await req.json();

    if (!to) {
      return NextResponse.json(
        { error: "Falta el número de destino" },
        { status: 400 },
      );
    }

    if (!parkingLotId) {
      return NextResponse.json(
        { error: "Falta el identificador del parqueadero" },
        { status: 400 },
      );
    }

    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: lotData, error: lotError } = await supabaseAdmin
        .from("parking_lots")
        .select("features")
        .eq("id", parkingLotId)
        .single();

      if (
        lotError ||
        !lotData ||
        !lotData.features ||
        !lotData.features.whatsapp_receipts
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La funcionalidad de WhatsApp no está habilitada para este parqueadero.",
          },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Configuración de servidor incompleta para validación de base de datos.",
        },
        { status: 500 },
      );
    }

    const client = twilio(twilioSid, twilioToken);

    let formattedTo = to.replace(/\D/g, "");
    if (!formattedTo.startsWith("57")) {
      formattedTo = "57" + formattedTo;
    }
    const whatsappTo = `whatsapp:+${formattedTo}`;

    // Asegurar que el remitente tenga el prefijo 'whatsapp:' y formato E.164
    let whatsappFrom = twilioPhone;
    if (!whatsappFrom.startsWith("whatsapp:")) {
      whatsappFrom = `whatsapp:+${whatsappFrom.replace(/\D/g, "")}`;
    }

    const messagePayload: any = {
      from: whatsappFrom,
      to: whatsappTo,
      body: text || "Su recibo de parqueadero adjunto.",
    };

    if (mediaUrl) {
      try {
        // Validar y sanear mediaUrl para prevenir SSRF
        let parsedUrl: URL;
        try {
          // Aceptar URLs absolutas propias o URLs relativas asumiendo localhost para validación interna
          if (mediaUrl.startsWith("http")) {
             parsedUrl = new URL(mediaUrl);
             // Si envían una URL absoluta, la forzamos a localhost internamente para la ruta de la API
             parsedUrl = new URL(parsedUrl.pathname + parsedUrl.search, "http://localhost");
          } else {
             parsedUrl = new URL(mediaUrl, "http://localhost");
          }
        } catch (e) {
          throw new Error("URL malformada");
        }

        if (parsedUrl.origin !== "http://localhost" || parsedUrl.pathname !== "/api/receipt-image") {
          throw new Error("Ruta de imagen no permitida o dominio inválido");
        }

        const safeUrl = new URL("http://localhost/api/receipt-image");
        safeUrl.search = parsedUrl.search;

        const { GET: generateImage } = await import("../receipt-image/route");
        const mockRequest = new Request(safeUrl.toString());
        const response = await generateImage(mockRequest);

        if (!response.ok)
          throw new Error(
            `Failed to generate image locally: ${response.status}`,
          );

        // 2. Usar el ArrayBuffer directamente sin transformarlo
        const arrayBuffer = await response.arrayBuffer();

        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin.storage
            .createBucket("receipts", { public: true })
            .catch(() => {});

          const fileName = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;

          // 3. Pasamos el arrayBuffer limpio a Supabase
          const { data: uploadData, error: uploadError } =
            await supabaseAdmin.storage
              .from("receipts")
              .upload(fileName, arrayBuffer, {
                contentType: "image/png",
                cacheControl: "3600",
                upsert: false,
              });

          if (uploadError) {
            console.error("Error uploading image to Supabase");
            // No agregamos fallback aquí, ya está embebido en el `text` inicial por parte del cliente
          } else {
            const { data: publicUrlData } = supabaseAdmin.storage
              .from("receipts")
              .getPublicUrl(fileName);

            messagePayload.mediaUrl = [publicUrlData.publicUrl];
            console.log(
              "Imagen subida a Supabase, URL pública:",
              publicUrlData.publicUrl,
            );
          }
        }
      } catch (uploadObjError) {
        console.error("Error in image generation or upload", uploadObjError);
        // Fallback: Si algo falla, ignoramos silenciosamente la imagen y enviamos solo el texto.
        // El texto original enviado por el cliente ya contiene la URL directa (directReceiptLink).
      }
    }

    const message = await client.messages.create(messagePayload);
    console.log("Mensaje aceptado por Twilio, SID:", message.sid);

    return NextResponse.json({ success: true, messageSid: message.sid });
  } catch (error: unknown) {
    console.error("Twilio Error");
    let errMsg = getErrorMessage(error) || "Error al enviar el mensaje por WhatsApp";
    errMsg = errMsg.replace(/https:\/\/api\.twilio\.com[^\s]*/g, "");
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}
