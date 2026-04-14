"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Car, Clock, Calendar, CheckCircle2, X } from "lucide-react";

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
  const [totalFee, setTotalFee] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    try {
      // 1. Check if vehicle exists or create it
      let vehicleId = null;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", plate.toUpperCase())
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const { data: newVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert([{
            plate: plate.toUpperCase(),
            type,
            brand,
            color,
            owner_name: ownerName,
          }])
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = newVehicle.id;
      }

      // 2. Create session
      const entryTimestamp = new Date(`${entryDate}T${entryTime}`).toISOString();
      const exitTimestamp = isCompleted ? new Date(`${exitDate}T${exitTime}`).toISOString() : null;

      const sessionData: any = {
        parking_lot_id: parkingLotId,
        vehicle_id: vehicleId,
        status: isCompleted ? "completed" : "active",
        entry_time: entryTimestamp,
        entry_employee_name: "Admin (Manual)",
        extra_data: extraData
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

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={20} />
          <p>{success}</p>
        </div>
      )}

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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa Cobrada ($) *</label>
                  <input
                    type="number"
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required={isCompleted}
                  />
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
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
