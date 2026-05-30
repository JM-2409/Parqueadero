"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Plus, Trash2, X, Car, LayoutGrid, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function TariffSettings({ parkingLotId, allowedVehicles }: { parkingLotId: string, allowedVehicles: string[] }) {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Form states
  const [vehicleType, setVehicleType] = useState(allowedVehicles[0] || "");
  const [rateType, setRateType] = useState("hora");
  const [amount, setAmount] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isAdding, setIsAdding] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("tariffs_v3")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching tariffs:", error);
      setErrorMsg("Error al obtener las tarifas. " + error.message);
    }
    if (data) setTariffs(data);
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    if (allowedVehicles.length > 0 && !vehicleType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVehicleType(allowedVehicles[0]);
    }
  }, [allowedVehicles, vehicleType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTariffs();
  }, [fetchTariffs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleType || !rateType || !amount) return;

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("El valor de la tarifa debe ser un número positivo mayor a $0.");
      return;
    }

    const existingVehicleTariffs = tariffs.filter(t => t.vehicle_type === vehicleType);
    
    if (existingVehicleTariffs.some(t => t.rate_type === rateType)) {
      alert(`Ya existe una tarifa de tipo "${RATE_LABELS[rateType] || rateType}" para ${vehicleType}. Elimínala primero si deseas actualizarla.`);
      return;
    }

    setIsAdding(true);
    setSuccess("");
    
    const isShiftRate = rateType === 'dia' || rateType === 'noche';

    const payload: any = {
      parking_lot_id: parkingLotId,
      vehicle_type: vehicleType,
      rate_type: rateType,
      amount: parsedAmount
    };

    if (isShiftRate) {
      payload.start_time = startTime;
      payload.end_time = endTime;
    }

    const { error } = await supabase.from("tariffs_v3").insert([payload]);

    if (error) {
      console.error("Error al guardar tarifa:", error);
      if (typeof error === 'object' && JSON.stringify(error).includes("start_time")) {
        setErrorMsg("Faltan columnas. Ejecuta el nuevo SQL para tariffs_v3 en el README.");
      } else {
        setErrorMsg("Error al guardar: " + (error.message || JSON.stringify(error)));
      }
      setIsAdding(false);
      return;
    }

    await fetchTariffs();
    setAmount("");
    setIsAdding(false);
    setSuccess(`Tarifa agregada exitosamente`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDelete = async (id: string) => {
    setSuccess("");
    setErrorMsg("");
    setDeletingId(id);
    
    // Select to detect RLS failure
    const { error } = await supabase.from("tariffs_v3").delete().eq("id", id);
    
    if (error) {
      console.error("Delete error:", error);
      setErrorMsg("Error al eliminar la tarifa: " + (error.message || JSON.stringify(error)));
      setDeletingId(null);
      return;
    }
    
    await fetchTariffs();
    setSuccess("Tarifa eliminada");
    setDeletingId(null);
    setTimeout(() => setSuccess(""), 3000);
  };

  const RATE_LABELS: Record<string, string> = {
    'dia': 'Día (Turno)',
    'noche': 'Noche (Turno)',
    'hora': 'Por Hora',
    'minuto': 'Por Minuto',
    'segundo': 'Por Segundo',
    'mes': 'Mensualidad',
    'bloque_12h': 'Bloque (12h)'
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <Spinner size={32} className="text-indigo-500 mb-4" />
      <p>Cargando tarifas...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tarifas y Cobros</h2>
          <p className="text-sm text-slate-500 mt-1">Configura las reglas de cobro por vehículo. El sistema aplica la mejor tarifa automáticamente.</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hidden md:block">
          <DollarSign size={28} />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <X size={20} className="flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {allowedVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Car size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sin vehículos configurados</h3>
          <p className="text-slate-500 max-w-sm">Primero debes configurar los tipos de vehículos permitidos (Carro, Moto, etc.) en la pestaña de Configuración.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Plus size={20} className="text-indigo-500" />
                Crear Tarifa
              </h3>
              
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vehículo</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-medium transition-all"
                    required
                  >
                    {allowedVehicles.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Tarifa</label>
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                    required
                  >
                    <option value="dia">Día (Turno o Tope)</option>
                    <option value="noche">Noche (Turno o Tope)</option>
                    <option value="bloque_12h">Bloque 12h</option>
                    <option value="hora">Por Hora</option>
                    <option value="minuto">Por Minuto</option>
                    <option value="segundo">Por Segundo</option>
                    <option value="mes">Mensualidad</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 transition-all">
                  {(rateType === "dia" || rateType === "noche") && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">De (Hora)</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Hasta (Hora)</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Valor ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                      placeholder="5000"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3.5 font-bold transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isAdding ? <Spinner size={18} className="text-white" /> : <Plus size={18} />}
                  Guardar Tarifa
                </button>
              </form>
            </div>
          </div>

          {/* Tariffs List */}
          <div className="lg:col-span-2 space-y-6">
            {allowedVehicles.map(vehicle => {
              const vehicleTariffs = tariffs.filter(t => t.vehicle_type === vehicle);
              if (vehicleTariffs.length === 0) return null;
              
              return (
                <div key={vehicle} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase shrink-0">
                      {vehicle.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{vehicle}</h3>
                    <span className="ml-auto bg-slate-100 text-slate-600 min-w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold px-2">
                      {vehicleTariffs.length}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {vehicleTariffs.map(t => (
                      <div key={t.id} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {['hora', 'minuto', 'segundo'].includes(t.rate_type) ? (
                              <Clock size={14} className="text-indigo-400" />
                            ) : (
                              <Calendar size={14} className="text-emerald-400" />
                            )}
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {RATE_LABELS[t.rate_type] || t.rate_type}
                            </p>
                          </div>
                          <p className="text-xl font-black text-slate-900">
                            ${t.amount.toLocaleString('es-CO')}
                          </p>
                          {(t.rate_type === "dia" || t.rate_type === "noche") && t.start_time && (
                            <p className="text-[10px] font-mono text-slate-400 mt-1">
                              {t.start_time.substring(0,5)} - {t.end_time.substring(0,5)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          title="Eliminar tarifa"
                        >
                          {deletingId === t.id ? <Spinner size={18} className="text-red-500" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {tariffs.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center h-full min-h-[300px]">
                <LayoutGrid size={32} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Aún no hay tarifas configuradas.</p>
                <p className="text-sm text-slate-400 mt-1">Crea tu primera tarifa usando el formulario.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
