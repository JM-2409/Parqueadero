"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Save, CheckCircle2, History, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function TariffSettings({ parkingLotId, allowedVehicles }: { parkingLotId: string, allowedVehicles: string[] }) {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [tariffHistory, setTariffHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data: histData } = await supabase
      .from("tariff_history")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });
    
    if (histData) {
      setTariffHistory(histData);
    }
  }, [parkingLotId]);

  useEffect(() => {
    if (showHistory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tariffs")
      .select("*")
      .eq("parking_lot_id", parkingLotId);
    
    if (data) {
      setTariffs(data);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTariffs();
  }, [parkingLotId, fetchTariffs]);

  const handleSave = async (vehicleType: string, tariffData: any, mode: string) => {
    setSaving(true);
    setSuccess("");

    // If "Tarifa Única" mode, ensure night rate equals day rate
    if (mode === "unica") {
      tariffData.night_rate = tariffData.day_rate;
    } else if (mode === "solo_dia") {
      tariffData.night_rate = 0;
    } else if (mode === "solo_noche") {
      tariffData.day_rate = 0;
    }

    const existingTariff = tariffs.find(t => t.vehicle_type === vehicleType);

    if (existingTariff) {
      await supabase
        .from("tariffs")
        .update(tariffData)
        .eq("id", existingTariff.id);
    } else {
      await supabase
        .from("tariffs")
        .insert([{ ...tariffData, parking_lot_id: parkingLotId, vehicle_type: vehicleType }]);
    }

    // Insert history record
    await supabase
      .from("tariff_history")
      .insert([{
        parking_lot_id: parkingLotId,
        vehicle_type: vehicleType,
        ...tariffData
      }]);

    await fetchTariffs();
    setSaving(false);
    setSuccess(`Tarifa de ${vehicleType} guardada exitosamente`);
    setTimeout(() => setSuccess(""), 3000);
  };

  if (loading) return <div className="py-8 text-center text-slate-500">Cargando tarifas...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Configuración de Tarifas</h2>
            <p className="text-sm text-slate-500">Define cómo se cobra por cada tipo de vehículo</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <History size={18} />
          <span className="hidden sm:inline">Historial de Cambios</span>
        </button>
      </div>

      {success && <SuccessMessage message={success} />}

      {allowedVehicles.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
          Primero debes permitir tipos de vehículos en la pestaña Configuración.
        </div>
      ) : (
        <div className="space-y-8">
          {allowedVehicles.map((type) => {
            const existing = tariffs.find(t => t.vehicle_type === type) || {
              charge_type: "hora",
              day_rate: 0,
              night_rate: 0,
              day_start_time: "06:00",
              night_start_time: "18:00",
              free_minutes: 0,
              block_hours: 12
            };

            // Determine initial mode based on data
            let initialMode = "dia_noche";
            if (existing.day_rate === existing.night_rate) {
              initialMode = "unica";
            } else if (existing.night_rate === 0 && existing.day_rate > 0) {
              initialMode = "solo_dia";
            } else if (existing.day_rate === 0 && existing.night_rate > 0) {
              initialMode = "solo_noche";
            }
            
            return (
              <TariffForm 
                key={type} 
                vehicleType={type} 
                initialData={existing} 
                initialMode={initialMode}
                onSave={handleSave} 
                saving={saving} 
              />
            );
          })}
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <History size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Historial de Tarifas</h3>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 flex-1">
              {tariffHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No hay historial de cambios en las tarifas.</p>
              ) : (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 uppercase">Vehículo</th>
                        <th className="px-4 py-3">Tipo Cobro</th>
                        <th className="px-4 py-3">Tarifa Día</th>
                        <th className="px-4 py-3">Inicio Día</th>
                        <th className="px-4 py-3">Tarifa Noche</th>
                        <th className="px-4 py-3">Inicio Noche</th>
                        <th className="px-4 py-3">Fracción (Min)</th>
                        <th className="px-4 py-3">Horas Bloque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tariffHistory.map(hist => (
                        <tr key={hist.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {new Date(hist.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 uppercase font-medium">{hist.vehicle_type}</td>
                          <td className="px-4 py-3 capitalize">{hist.charge_type}</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">${hist.day_rate}</td>
                          <td className="px-4 py-3 text-slate-600">{hist.day_start_time}</td>
                          <td className="px-4 py-3 text-indigo-600 font-medium">${hist.night_rate}</td>
                          <td className="px-4 py-3 text-slate-600">{hist.night_start_time}</td>
                          <td className="px-4 py-3 text-slate-600">{hist.free_minutes} min</td>
                          <td className="px-4 py-3 text-slate-600">{hist.block_hours} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TariffForm({ vehicleType, initialData, initialMode, onSave, saving }: any) {
  const [data, setData] = useState(initialData);
  const [mode, setMode] = useState(initialMode); // 'unica' or 'dia_noche'

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
      <h3 className="text-lg font-bold text-slate-800 capitalize mb-4 pb-2 border-b border-slate-200">
        {vehicleType}
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Modo de Horario</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="unica">Todo el día (Tarifa Única)</option>
            <option value="dia_noche">Día y Noche (Tarifas Diferentes)</option>
            <option value="solo_dia">Solo Día</option>
            <option value="solo_noche">Solo Noche</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cobro</label>
          <select
            value={data.charge_type}
            onChange={(e) => setData({ ...data, charge_type: e.target.value })}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="segundo">Por Segundo</option>
            <option value="minuto">Por Minuto</option>
            <option value="fraccion">Por Fracción</option>
            <option value="hora">Por Hora</option>
            <option value="12_horas">Cada 12 Horas</option>
            <option value="24_horas">Cada 24 Horas</option>
            <option value="turnos">Por Turnos (Día y Noche sumables)</option>
            <option value="bloque">Por Bloque de Horas</option>
          </select>
        </div>
      </div>

      {data.charge_type === "fraccion" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Minutos de la Fracción</label>
          <input
            type="number"
            value={data.fraction_minutes !== undefined ? data.fraction_minutes : 15}
            onChange={(e) => setData({ ...data, fraction_minutes: Number(e.target.value) })}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            min="1"
          />
          <p className="text-xs text-slate-500 mt-1">Ej. 15 minutos, 30 minutos</p>
        </div>
      )}

      {data.charge_type === "turnos" && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-sm text-indigo-800 mb-3 font-medium">Configuración de Turnos (Día y Noche)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-indigo-700 mb-1">Inicio Turno Día</label>
              <input
                type="time"
                value={data.day_start_time || "06:00"}
                onChange={(e) => setData({ ...data, day_start_time: e.target.value })}
                className="w-full p-2 border border-indigo-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-indigo-700 mb-1">Inicio Turno Noche</label>
              <input
                type="time"
                value={data.night_start_time || "18:00"}
                onChange={(e) => setData({ ...data, night_start_time: e.target.value })}
                className="w-full p-2 border border-indigo-200 rounded-lg outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-indigo-700 mb-1">Minutos de Gabela (Tolerancia)</label>
              <input
                type="number"
                value={data.grace_period_minutes !== undefined ? data.grace_period_minutes : 15}
                onChange={(e) => setData({ ...data, grace_period_minutes: Number(e.target.value) })}
                className="w-full p-2 border border-indigo-200 rounded-lg outline-none"
                min="0"
                placeholder="Ej. 15"
              />
              <p className="text-[10px] text-indigo-600 mt-1">Tiempo de gracia antes/después de un turno para no cobrarlo.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {mode !== "solo_noche" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {mode === "unica" ? "Valor de la Tarifa ($)" : "Tarifa de Día ($)"}
            </label>
            <input
              type="number"
              value={data.day_rate}
              onChange={(e) => setData({ ...data, day_rate: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              min="0"
            />
          </div>
        )}

        {(mode === "dia_noche" || mode === "solo_noche") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {mode === "solo_noche" ? "Valor de la Tarifa ($)" : "Tarifa de Noche ($)"}
            </label>
            <input
              type="number"
              value={data.night_rate}
              onChange={(e) => setData({ ...data, night_rate: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              min="0"
            />
          </div>
        )}
      </div>

      {(mode === "dia_noche" || mode === "solo_dia" || mode === "solo_noche") && (
        <div className="grid md:grid-cols-2 gap-6 mb-6 p-4 bg-white rounded-lg border border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora inicio Día</label>
            <input
              type="time"
              value={data.day_start_time}
              onChange={(e) => setData({ ...data, day_start_time: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora inicio Noche</label>
            <input
              type="time"
              value={data.night_start_time}
              onChange={(e) => setData({ ...data, night_start_time: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Minutos de Gracia (Gratis)</label>
          <input
            type="number"
            value={data.free_minutes}
            onChange={(e) => setData({ ...data, free_minutes: Number(e.target.value) })}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            min="0"
          />
          <p className="text-xs text-slate-500 mt-1">Tiempo libre antes de empezar a cobrar</p>
        </div>

        {data.charge_type === "bloque" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Horas por Bloque</label>
            <input
              type="number"
              value={data.block_hours}
              onChange={(e) => setData({ ...data, block_hours: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              min="1"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(vehicleType, data, mode)}
          disabled={saving}
          className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {saving ? (
            <Spinner size={16} className="text-white" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "Guardando..." : "Guardar Tarifa"}
        </button>
      </div>
    </div>
  );
}
