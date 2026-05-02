"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Car, Clock, Calendar, CheckCircle2, X } from "lucide-react";
import { sanitizeInput } from "@/lib/sanitize";
import { calculateFee } from "@/lib/pricing";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function ManualEntry({ parkingLotId, allowedVehicles, customFields }: { parkingLotId: string, allowedVehicles: string[], customFields: any[] }) {
  const [plate, setPlate] = useState("");
  const [type, setType] = useState(allowedVehicles[0] || "carros");
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [isCompleted, setIsCompleted] = useState(true);
  const [isSpecialFee, setIsSpecialFee] = useState(false);
  const [totalFee, setTotalFee] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [tariffs, setTariffs] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchTariffs = async () => {
      const { data } = await supabase
        .from("tariffs_v3")
        .select("*")
        .eq("parking_lot_id", parkingLotId);
      if (data) setTariffs(data);
    };
    fetchTariffs();
  }, [parkingLotId]);

  useEffect(() => {
    if (isSpecialFee || !isCompleted || !entryDate || !entryTime || !exitDate || !exitTime) return;

    const entry = new Date(`${entryDate}T${entryTime}`);
    const exit = new Date(`${exitDate}T${exitTime}`);
    
    if (isNaN(entry.getTime()) || isNaN(exit.getTime()) || exit <= entry) {
      setTotalFee("");
      return;
    }

    const durationMs = exit.getTime() - entry.getTime();
    
    const vehicleTariffs = tariffs.filter(t => t.vehicle_type === type);
    if (vehicleTariffs.length === 0) return;

    const calculatedFee = calculateFee(entry, exit, vehicleTariffs);

    setTotalFee(calculatedFee.toString());
  }, [entryDate, entryTime, exitDate, exitTime, type, tariffs, isSpecialFee, isCompleted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!plate || !entryDate || !entryTime) {
      setError("Placa, fecha y hora de entrada son obligatorios");
      setLoading(false);
      return;
    }

    if (isCompleted && (!exitDate || !exitTime || !totalFee)) {
      setError("Fecha, hora de salida y tarifa son obligatorios para registros completados");
      setLoading(false);
      return;
    }

    // Validar campos personalizados obligatorios
    if (customFields && customFields.length > 0) {
      for (const field of customFields) {
        if (field.required && !extraData[field.name]?.trim()) {
          setError(`El campo ${field.name} es obligatorio`);
          setLoading(false);
          return;
        }
      }
    }

    if (isCompleted) {
      const entry = new Date(`${entryDate}T${entryTime}`);
      const exit = new Date(`${exitDate}T${exitTime}`);
      if (exit <= entry) {
        setError("La fecha y hora de salida deben ser posteriores a la de entrada");
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Check if vehicle exists or create it
      let vehicleId = null;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", sanitizeInput(plate.toUpperCase()))
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const { data: newVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert([{
            plate: sanitizeInput(plate.toUpperCase()),
            type,
            brand: sanitizeInput(extraData['Marca'] || extraData['brand'] || ""),
            color: sanitizeInput(extraData['Color'] || extraData['color'] || ""),
            owner_name: sanitizeInput(extraData['Propietario'] || extraData['owner_name'] || ""),
            custom_fields_data: extraData
          }])
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = newVehicle.id;
      }

      // Sanitize extraData
      const sanitizedExtraData: Record<string, any> = {};
      Object.keys(extraData).forEach(key => {
        if (typeof extraData[key] === 'string') {
          sanitizedExtraData[key] = sanitizeInput(extraData[key]);
        } else {
          sanitizedExtraData[key] = extraData[key];
        }
      });

      // 2. Create session
      const entryTimestamp = new Date(`${entryDate}T${entryTime}`).toISOString();
      const exitTimestamp = isCompleted ? new Date(`${exitDate}T${exitTime}`).toISOString() : null;

      const sessionData: any = {
        parking_lot_id: parkingLotId,
        vehicle_id: vehicleId,
        status: isCompleted ? "completed" : "active",
        entry_time: entryTimestamp,
        entry_employee_name: "Admin (Manual)",
        extra_data: sanitizedExtraData
      };

      if (isCompleted) {
        sessionData.exit_time = exitTimestamp;
        sessionData.exit_employee_name = "Admin (Manual)";
        sessionData.total_fee = parseFloat(totalFee);
      }

      const { error: sessionError } = await supabase
        .from("parking_sessions")
        .insert([sessionData]);

      if (sessionError) throw sessionError;

      setSuccess("Registro histórico añadido exitosamente");
      setPlate("");
      setTotalFee("");
      setExtraData({});
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <Clock size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ingreso Manual (Histórico)</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Añade registros de vehículos del pasado</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 font-medium text-sm">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vehicle Info */}
          <div className="space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 text-lg tracking-tight">Datos del Vehículo</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Placa *</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold uppercase transition-all"
                placeholder="ABC-123"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Vehículo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium capitalize transition-all"
              >
                {allowedVehicles.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {customFields?.map((field, idx) => (
              <div key={idx}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {field.name} {field.required && "*"}
                </label>
                <input
                  type="text"
                  value={extraData[field.name] || ""}
                  onChange={(e) => setExtraData({...extraData, [field.name]: e.target.value})}
                  required={field.required}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                />
              </div>
            ))}
          </div>

          {/* Time Info */}
          <div className="space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 text-lg tracking-tight">Datos de Tiempo</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Fecha Entrada *</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Hora Entrada *</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 mb-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input
                type="checkbox"
                id="isCompleted"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors"
              />
              <label htmlFor="isCompleted" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                El vehículo ya salió (Completado)
              </label>
            </div>

            {isCompleted && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Fecha Salida *</label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={(e) => setExitDate(e.target.value)}
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                      required={isCompleted}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Hora Salida *</label>
                    <input
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                      required={isCompleted}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="isSpecialFee"
                      checked={isSpecialFee}
                      onChange={(e) => setIsSpecialFee(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors"
                    />
                    <label htmlFor="isSpecialFee" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                      Tarifa especial (Ingresar valor manualmente)
                    </label>
                  </div>
                  
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 ml-1">Tarifa Cobrada ($) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      disabled={!isSpecialFee}
                      className={`w-full text-base rounded-xl px-4 py-3 pl-8 outline-none font-black transition-all ${!isSpecialFee ? 'bg-slate-100/50 text-slate-500 border border-slate-100' : 'bg-slate-50 border-0 text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-sm shadow-indigo-100/50'}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required={isCompleted}
                    />
                  </div>
                  {!isSpecialFee && (
                    <p className="text-xs font-medium text-slate-400 mt-2 ml-1">El valor se calcula automáticamente según las tarifas. Marca <span className="font-bold text-slate-500">&quot;Tarifa especial&quot;</span> para modificarlo.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-3 text-lg mx-auto"
          >
            {loading ? (
              <Spinner size={24} className="text-white" />
            ) : (
              <>
                <Car size={24} />
                Guardar Registro Histórico
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
