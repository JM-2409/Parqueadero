"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Car, Clock, Calendar, CheckCircle2, X } from "lucide-react";
import { sanitizeInput } from "@/lib/sanitize";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function ManualEntry({ parkingLotId, allowedVehicles, customFields }: { parkingLotId: string, allowedVehicles: string[], customFields: any[] }) {
  const [plate, setPlate] = useState("");
  const [type, setType] = useState(allowedVehicles[0] || "carros");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [ownerName, setOwnerName] = useState("");
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
        .from("tariffs")
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
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    
    const vehicleTariffs = tariffs.filter(t => t.vehicle_type === type);
    if (vehicleTariffs.length === 0) return;

    let calculatedFee = 0;
    
    const monthlyTariff = vehicleTariffs.find(t => t.rate_type === "month");
    const dailyTariff = vehicleTariffs.find(t => t.rate_type === "day");
    const hourlyTariff = vehicleTariffs.find(t => t.rate_type === "hour");
    const minuteTariff = vehicleTariffs.find(t => t.rate_type === "minute");

    if (monthlyTariff && durationMinutes >= 30 * 24 * 60) {
      calculatedFee = Math.ceil(durationMinutes / (30 * 24 * 60)) * monthlyTariff.amount;
    } else if (dailyTariff && durationMinutes >= 24 * 60) {
      calculatedFee = Math.ceil(durationMinutes / (24 * 60)) * dailyTariff.amount;
    } else if (hourlyTariff && durationMinutes >= 60) {
      calculatedFee = Math.ceil(durationMinutes / 60) * hourlyTariff.amount;
    } else if (minuteTariff) {
      calculatedFee = durationMinutes * minuteTariff.amount;
    } else if (hourlyTariff) {
      calculatedFee = hourlyTariff.amount; // fallback to 1 hour if less than an hour and no minute tariff
    }

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
            brand: sanitizeInput(brand),
            color: sanitizeInput(color),
            owner_name: sanitizeInput(ownerName),
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
      setBrand("");
      setColor("");
      setOwnerName("");
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Clock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Ingreso Manual (Histórico)</h2>
          <p className="text-sm text-slate-500">Añade registros de vehículos del pasado</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <X size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900 border-b pb-2">Datos del Vehículo</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                placeholder="ABC-123"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Vehículo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
              >
                {allowedVehicles.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {customFields?.map((field, idx) => (
              <div key={idx}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.name} {field.required && "*"}
                </label>
                <input
                  type="text"
                  value={extraData[field.name] || ""}
                  onChange={(e) => setExtraData({...extraData, [field.name]: e.target.value})}
                  required={field.required}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            ))}
          </div>

          {/* Time Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900 border-b pb-2">Datos de Tiempo</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Entrada *</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Entrada *</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 mb-2">
              <input
                type="checkbox"
                id="isCompleted"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="isCompleted" className="text-sm font-medium text-slate-700">
                El vehículo ya salió (Registro completado)
              </label>
            </div>

            {isCompleted && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Salida *</label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={(e) => setExitDate(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      required={isCompleted}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora Salida *</label>
                    <input
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      required={isCompleted}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="isSpecialFee"
                      checked={isSpecialFee}
                      onChange={(e) => setIsSpecialFee(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="isSpecialFee" className="text-sm font-medium text-slate-700">
                      Tarifa especial (Ingresar valor manualmente)
                    </label>
                  </div>
                  
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa Cobrada ($) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      disabled={!isSpecialFee}
                      className={`w-full p-3 pl-8 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none ${!isSpecialFee ? 'bg-slate-100 text-slate-600' : ''}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required={isCompleted}
                    />
                  </div>
                  {!isSpecialFee && (
                    <p className="text-xs text-slate-500 mt-1">El valor se calcula automáticamente según las tarifas. Marca &quot;Tarifa especial&quot; para modificarlo.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-lg mt-6"
        >
          {loading ? (
            <Spinner size={24} className="text-white" />
          ) : (
            <>
              <Car size={24} />
              Guardar Registro
            </>
          )}
        </button>
      </form>
    </div>
  );
}
