"use client";

import { Receipt, Printer, X, Car } from "lucide-react";

export default function ReceiptModal({ session, appSettings, parkingLot, onClose }: any) {
  const handlePrint = () => {
    window.print();
  };

  const entryTime = new Date(session.entry_time);
  const exitTime = new Date(session.exit_time);
  const durationMs = exitTime.getTime() - entryTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative print:shadow-none print:max-w-none print:w-[80mm] print:p-0">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6 print:pb-4">
          {appSettings?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appSettings.logo_url} alt="Logo" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-slate-100 shadow-sm" />
          ) : (
            <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Car size={40} />
            </div>
          )}
          
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">
            {appSettings?.app_name || parkingLot?.name || "Parqueadero"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">NIT: {parkingLot?.nit}</p>
          <p className="text-sm text-slate-500">{parkingLot?.address}</p>
        </div>

        <div className="space-y-4 mb-6 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Recibo No.</span>
            <span className="font-mono font-bold text-slate-900">{session.receipt_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Placa</span>
            <span className="font-mono font-bold text-lg text-slate-900 bg-slate-100 px-2 py-1 rounded">{session.vehicles.plate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Tipo</span>
            <span className="font-medium text-slate-900 capitalize">{session.vehicles.type}</span>
          </div>

          {((session.extra_data && Object.keys(session.extra_data).length > 0) || (session.vehicles?.custom_fields_data && Object.keys(session.vehicles.custom_fields_data).length > 0)) && (
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Datos Adicionales</span>
              {Object.entries({...session.vehicles?.custom_fields_data, ...session.extra_data}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 capitalize min-w-[80px]">{key}</span>
                  <span className="font-medium text-slate-900 text-right break-words">{value as string}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ingreso</span>
              <span className="font-medium text-slate-900">{entryTime.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Salida</span>
              <span className="font-medium text-slate-900">{exitTime.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tiempo Total</span>
              <span className="font-medium text-slate-900">{hours}h {minutes}m</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl mt-6 mb-6 print:bg-transparent print:border-t print:border-dashed print:border-slate-300 print:rounded-none">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">TOTAL A PAGAR</span>
            <span className="text-2xl font-bold text-emerald-600">${session.total_charged?.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mb-8 print:mb-0">
          <p>¡Gracias por su visita!</p>
          <p>Conserve este recibo para cualquier reclamo.</p>
        </div>

        <div className="flex gap-3 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
