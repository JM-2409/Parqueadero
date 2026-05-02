"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Save, Plus, Trash2, History, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function TariffSettings({ parkingLotId, allowedVehicles }: { parkingLotId: string, allowedVehicles: string[] }) {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Form states
  const [vehicleType, setVehicleType] = useState(allowedVehicles[0] || "");
  const [rateType, setRateType] = useState("hora");
  const [amount, setAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("tariffs_v2")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching tariffs:", error);
      if (error.message.includes("Could not find the table") || error.message.includes("schema cache")) {
        setErrorMsg("Falta la tabla 'tariffs_v2' en tu base de datos. Pídele al Dueño que ejecute el Código SQL que está en el README.md en la consola de Supabase. Alternativamente intenta recargar la página si ya lo hiciste.");
      } else {
        setErrorMsg("Error al obtener las tarifas. " + error.message);
      }
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

    // Basic coherence validations
    const existingVehicleTariffs = tariffs.filter(t => t.vehicle_type === vehicleType);
    
    if (rateType === 'hora') {
      const minTariff = existingVehicleTariffs.find(t => t.rate_type === 'minuto');
      if (minTariff && parsedAmount <= minTariff.amount) {
        alert("Error de coherencia: La tarifa por hora debería ser mayor a la tarifa por minuto.");
        return;
      }
      const dayTariff = existingVehicleTariffs.find(t => t.rate_type === 'dia');
      if (dayTariff && parsedAmount >= dayTariff.amount) {
        alert("Error de coherencia: La tarifa por hora no debería ser mayor o igual a la tarifa del día completo.");
        return;
      }
    }
    
    if (rateType === 'dia') {
      const hourTariff = existingVehicleTariffs.find(t => t.rate_type === 'hora');
      if (hourTariff && parsedAmount <= hourTariff.amount) {
        alert("Error de coherencia: La tarifa por día debería ser mayor a la tarifa por hora.");
        return;
      }
    }

    if (rateType === 'mes') {
      const dayTariff = existingVehicleTariffs.find(t => t.rate_type === 'dia');
      if (dayTariff && parsedAmount <= dayTariff.amount) {
        alert("Error de coherencia: La tarifa mensual debería ser mayor a la tarifa de un día.");
        return;
      }
    }

    // Check if the rate type already exists for this vehicle
    if (existingVehicleTariffs.some(t => t.rate_type === rateType)) {
      alert(`Ya existe una tarifa de tipo "${RATE_LABELS[rateType] || rateType}" para ${vehicleType}. Elimínala primero si deseas actualizarla.`);
      return;
    }

    setIsAdding(true);
    setSuccess("");

    const { error } = await supabase
      .from("tariffs_v2")
      .insert([{
        parking_lot_id: parkingLotId,
        vehicle_type: vehicleType,
        rate_type: rateType,
        amount: parsedAmount
      }]);

    if (error) {
      console.error("Error al guardar tarifa:", error);
      alert("Error al guardar: " + error.message);
      setIsAdding(false);
      return;
    }

    await fetchTariffs();
    setAmount("");
    setIsAdding(false);
    setSuccess(`Tarifa agregada exitosamente`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDelete = async (id: string, type: string, rate: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la tarifa de ${RATE_LABELS[rate] || rate} para ${type}?`)) return;
    
    setSuccess("");
    const { error } = await supabase.from("tariffs_v2").delete().eq("id", id);
    if (error) {
      setErrorMsg("Error al eliminar la tarifa: " + error.message);
      return;
    }
    await fetchTariffs();
    setSuccess("Tarifa eliminada");
    setTimeout(() => setSuccess(""), 3000);
  };

  const RATE_LABELS: Record<string, string> = {
    'dia': 'Día (Turno Día)',
    'noche': 'Noche (Turno Noche)',
    'hora': 'Por Hora',
    'minuto': 'Por Minuto',
    'segundo': 'Por Segundo',
    'mes': 'Mensualidad'
  };

  if (loading) return <div className="py-8 text-center text-slate-500">Cargando tarifas...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
          <DollarSign size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Configuración de Tarifas</h2>
          <p className="text-sm text-slate-500">Administra las reglas de cobro por vehículo. El sistema agrupará y calculará automáticamente.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <X size={20} className="flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {allowedVehicles.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
          Primero debes permitir tipos de vehículos en la pestaña Configuración.
        </div>
      ) : (
        <div className="space-y-8">
          
          <form onSubmit={handleAdd} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Agregar Nueva Tarifa</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Vehículo</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white uppercase"
                  required
                >
                  {allowedVehicles.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Tarifa</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  required
                >
                  <option value="dia">Día (Tope Máximo o Turno Día)</option>
                  <option value="noche">Noche (Tope Máximo o Turno Noche)</option>
                  <option value="hora">Por Hora</option>
                  <option value="minuto">Por Minuto</option>
                  <option value="segundo">Por Segundo</option>
                  <option value="mes">Mensualidad (Abonados)</option>
                </select>
              </div>

              <div className="flex-1 w-full relative">
                <label className="block text-xs font-medium text-slate-500 mb-1">Valor ($)</label>
                <span className="absolute left-3 top-9 text-slate-500 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 pl-7 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  placeholder="Ej: 5000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                {isAdding ? <Spinner size={18} className="text-white" /> : <Plus size={18} />}
                Agregar
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Tarifas Configuradas</h3>
            {tariffs.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl text-slate-500">
                Aún no hay tarifas agregadas. Utiliza el formulario arriba para crear la primera.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Vehículo</th>
                      <th className="px-4 py-3">Tipo Tarifa</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tariffs.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold uppercase text-slate-700">
                          {t.vehicle_type}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {RATE_LABELS[t.rate_type] || t.rate_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 text-right">
                          ${t.amount.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-center w-24">
                          <button
                            onClick={() => handleDelete(t.id, t.vehicle_type, t.rate_type)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-block mx-auto"
                            title="Eliminar Tarifa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
