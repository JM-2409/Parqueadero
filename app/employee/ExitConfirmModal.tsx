"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  LogOut,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { calculateFee } from "@/lib/pricing";
import { formatElapsedDuration, getSessionVehicle } from "@/lib/utils";

type ExitConfirmModalProps = {
  session: any;
  parkingLot: any;
  tariffs: any[];
  specialTariffs: any[];
  subscribers: any[];
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function VehicleIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  if (normalized === "motos") return <Bike size={28} />;
  if (normalized === "bicicletas") return <Bike size={28} />;
  if (normalized.includes("camion") || normalized.includes("truck")) {
    return <Truck size={28} />;
  }
  return <Car size={28} />;
}

export default function ExitConfirmModal({
  session,
  parkingLot,
  tariffs,
  specialTariffs,
  subscribers,
  isLoading = false,
  onConfirm,
  onCancel,
}: ExitConfirmModalProps) {
  const vehicle = getSessionVehicle(session);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isSubscriber = subscribers.some((sub) => sub.plate === vehicle.plate);
  const isSpecialTariff = specialTariffs.some(
    (st) =>
      st.plate === vehicle.plate.toUpperCase() && st.is_active !== false,
  );

  const fee = useMemo(() => {
    if (isSubscriber) return 0;
    return calculateFee(
      new Date(session.entry_time),
      now,
      tariffs.filter((t) => t.vehicle_type === vehicle.type),
      {
        entry_grace_period_mins: parkingLot?.entry_grace_period_mins,
        shift_grace_period_mins: parkingLot?.shift_grace_period_mins,
      },
      specialTariffs.filter(
        (st) => st.plate === vehicle.plate.toUpperCase(),
      ),
    );
  }, [
    isSubscriber,
    now,
    parkingLot?.entry_grace_period_mins,
    parkingLot?.shift_grace_period_mins,
    session.entry_time,
    specialTariffs,
    tariffs,
    vehicle.plate,
    vehicle.type,
  ]);

  const entryLabel = new Date(session.entry_time).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="exit-confirm-title"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="relative bg-gradient-to-br from-indigo-700 to-indigo-900 px-6 pt-6 pb-8 text-white">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <LogOut size={20} />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-200">
                Registrar salida
              </p>
              <h3 id="exit-confirm-title" className="font-bold text-lg leading-tight">
                Confirmar cobro
              </h3>
            </div>
          </div>
          <div className="bg-white text-slate-900 rounded-2xl px-4 py-4 flex items-center gap-4 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <VehicleIcon type={vehicle.type} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Placa del vehículo
              </p>
              <p className="font-mono font-black text-3xl tracking-wide truncate uppercase">
                {vehicle.plate || "Sin placa"}
              </p>
              <p className="text-sm font-bold text-slate-600 capitalize">
                {vehicle.type || "Tipo no registrado"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {(isSubscriber || isSpecialTariff) && (
            <div className="flex flex-wrap gap-2">
              {isSubscriber && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  <Tag size={12} />
                  Abonado
                </span>
              )}
              {isSpecialTariff && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Tarifa especial
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Ingreso
              </p>
              <p className="font-bold text-slate-900 text-sm leading-snug">
                {entryLabel}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Clock size={12} />
                Tiempo
              </p>
              <p className="font-bold text-slate-900 text-sm">
                {formatElapsedDuration(session.entry_time, now)}
              </p>
            </div>
          </div>

          {session.entry_employee_name && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Registró el ingreso
              </p>
              <p className="font-bold text-slate-900">
                {session.entry_employee_name}
              </p>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm font-extrabold text-emerald-900 uppercase tracking-wide">
              Total a cobrar
            </span>
            <span className="text-2xl font-black text-emerald-700">
              ${fee.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm bg-indigo-700 hover:bg-indigo-800 text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saliendo...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Dar salida
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
