"use client";

import { Receipt, Printer, X, Car, Send } from "lucide-react";
import { useState } from "react";

export default function ReceiptModal({
  session,
  appSettings,
  parkingLot,
  onClose,
}: any) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const entryTime = new Date(session.entry_time);
  const exitTime = new Date(session.exit_time);
  const durationMs = exitTime.getTime() - entryTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  const handleSendWhatsAppAPI = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMessage("Ingrese un número válido (ej: 3001234567)");
      return;
    }

    setIsSending(true);
    setSendResult("idle");
    setErrorMessage("");

    try {
      // Create relative URL for the receipt-image generator API to pass SSRF check on backend
      const params = new URLSearchParams({
        receiptNumber: session.receipt_number || "-",
        plate: session.vehicles?.plate || "-",
        type: session.vehicles?.type || "-",
        total: (session.total_charged || session.fee || 0).toString(),
        entry: entryTime.toLocaleString(),
        exit: exitTime.toLocaleString(),
        appName: appSettings?.app_name || parkingLot?.name || "Parqueadero",
        nit: parkingLot?.nit || "-",
        address: parkingLot?.address || "",
        duration: `${hours}h ${minutes}m`,
      });
      const mediaUrl = `/api/receipt-image?${params.toString()}`;

      // Enlace directo de respaldo (se enviará por parte del servidor en el texto o lo usamos aquí como fallback visible)
      const directReceiptLink = `${window.location.origin}/api/receipt-image?${params.toString()}`;

      const text = `*Recibo de Parqueadero*\n\nParqueadero: ${appSettings?.app_name || parkingLot?.name || "Parqueadero"}\nNIT: ${parkingLot?.nit || "-"}\n\nRecibo No.: ${session.receipt_number || "-"}\nPlaca: ${session.vehicles?.plate || "-"}\nTipo: ${session.vehicles?.type || "-"}\nIngreso: ${entryTime.toLocaleString()}\nSalida: ${exitTime.toLocaleString()}\nTotal a Pagar: $${session.total_charged?.toLocaleString() || session.fee?.toLocaleString()}\n\nEnlace del recibo: ${directReceiptLink}\n\n¡Gracias por su visita!`;

      const response = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          mediaUrl,
          text,
          parkingLotId: parkingLot?.id,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al enviar el mensaje");
      }

      setSendResult("success");
      setTimeout(() => {
        setSendResult("idle");
      }, 5000);
    } catch (error: any) {
      console.error(error);
      setSendResult("error");
      setErrorMessage(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm print:absolute print:inset-0 print:bg-transparent print:p-0 print:block">
      <div
        id="printable-receipt"
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative print:shadow-none print:max-w-none print:w-[80mm] print:p-0 flex flex-col max-h-[90vh] md:max-h-none print:h-auto print:max-h-none print:block print:m-0"
        style={{ pageBreakInside: "avoid" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden z-10 bg-white/80 rounded-full p-1"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8 overflow-y-auto print:overflow-visible">
          <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6 print:pb-4">
            {appSettings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appSettings.logo_url}
                alt="Logo"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-4 border-2 border-slate-100 shadow-xl border border-slate-100"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl border border-slate-100">
                <Car size={32} />
              </div>
            )}

            <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wider">
              {appSettings?.app_name || parkingLot?.name || "Parqueadero"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              NIT: {parkingLot?.nit}
            </p>
            <p className="text-sm text-slate-500">{parkingLot?.address}</p>
          </div>

          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Recibo No.</span>
              <span className="font-mono font-bold text-slate-900">
                {session.receipt_number}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Placa</span>
              <span className="font-mono font-bold text-lg text-slate-900 bg-slate-100 px-2 py-1 rounded">
                {session.vehicles.plate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tipo</span>
              <span className="font-bold text-slate-900 capitalize">
                {session.vehicles.type}
              </span>
            </div>

            {((session.extra_data &&
              Object.keys(session.extra_data).length > 0) ||
              (session.vehicles?.custom_fields_data &&
                Object.keys(session.vehicles.custom_fields_data).length >
                  0)) && (
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 block">
                  Datos Adicionales
                </span>
                {Object.entries({
                  ...session.vehicles?.custom_fields_data,
                  ...session.extra_data,
                }).map(([key, value]) => {
                  if (key === "observation_photo_url") {
                    return (
                      <div key={key} className="flex flex-col gap-3 mt-2">
                        <span className="text-slate-500 capitalize">
                          Foto de Observación
                        </span>
                        <a
                          href={value as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-h-48 overflow-hidden rounded-3xl border border-slate-200"
                        >
                          <img
                            src={value as string}
                            alt="Observación"
                            className="w-full object-cover"
                          />
                        </a>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="flex justify-between items-start gap-4"
                    >
                      <span className="text-slate-500 capitalize min-w-[80px]">
                        {key}
                      </span>
                      <span className="font-bold text-slate-900 text-right break-words">
                        {value as string}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ingreso</span>
                <span className="font-bold text-slate-900">
                  {entryTime.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Salida</span>
                <span className="font-bold text-slate-900">
                  {exitTime.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tiempo Total</span>
                <span className="font-bold text-slate-900">
                  {hours}h {minutes}m
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-3xl mt-6 mb-6 print:bg-transparent print:border-t print:border-dashed print:border-slate-300 print:rounded-none">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">TOTAL A PAGAR</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${session.total_charged?.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 mb-8 print:mb-0">
            <p>¡Gracias por su visita!</p>
            <p>Conserve este recibo para cualquier reclamo.</p>
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 md:rounded-b-2xl flex flex-col gap-3 shrink-0 print:hidden">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Enviar SMS / WhatsApp
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                placeholder="Nº WhatsApp (ej. 3001234567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 w-full px-3 py-3 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-[#25D366] text-sm"
              />
              <button
                onClick={handleSendWhatsAppAPI}
                disabled={isSending}
                className="w-full sm:w-auto px-5 py-3 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-[#25D366]/50 text-white rounded-3xl transition-colors flex items-center justify-center gap-3 shrink-0"
                title="Enviar por WhatsApp"
              >
                {isSending ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {sendResult === "success" && (
              <p className="text-xs text-emerald-600 font-bold">
                ¡Mensaje enviado exitosamente!
              </p>
            )}

            {sendResult === "error" && (
              <p className="text-[10px] text-red-500 leading-tight">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-2 pt-4 border-t border-slate-200">
            <button
              onClick={handlePrint}
              className="flex-auto md:flex-1 py-3 px-5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 text-sm md:text-base"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-auto py-3 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-3xl font-bold transition-colors w-full md:w-auto md:flex-1 text-sm md:text-base"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
