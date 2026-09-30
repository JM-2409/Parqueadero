"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Tag,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  Car,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { sanitizeInput } from "@/lib/sanitize";

export default function SpecialTariffs({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [specialTariffs, setSpecialTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [plate, setPlate] = useState("");
  const [rateType, setRateType] = useState("dia");
  const [amount, setAmount] = useState("5000");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSpecialTariffs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("special_tariffs")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching special tariffs:", error);
      setErrorMsg("Error al cargar las tarifas especiales. Asegúrate de ejecutar el script SQL `special_tariffs.sql`.");
    } else {
      setSpecialTariffs(data || []);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    fetchSpecialTariffs();
  }, [fetchSpecialTariffs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccess("");

    const cleanPlate = sanitizeInput(plate.trim().toUpperCase());
    if (!cleanPlate) {
      setErrorMsg("Debes ingresar la placa del vehículo.");
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg("El valor debe ser un número válido igual o mayor a $0.");
      return;
    }

    if (!startDate) {
      setErrorMsg("Debes seleccionar la fecha de inicio.");
      return;
    }

    setIsSubmitting(true);

    const startDateTime = new Date(`${startDate}T00:00:00`).toISOString();
    const endDateTime = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;

    const payload = {
      parking_lot_id: parkingLotId,
      plate: cleanPlate,
      rate_type: rateType,
      amount: parsedAmount,
      start_date: startDateTime,
      end_date: endDateTime,
      description: description ? sanitizeInput(description) : null,
      is_active: true,
    };

    const { error } = await supabase.from("special_tariffs").insert([payload]);

    if (error) {
      console.error("Error al guardar tarifa especial:", error);
      setErrorMsg("Error al guardar la tarifa especial: " + error.message);
    } else {
      setSuccess(`Tarifa especial agregada para la placa ${cleanPlate}`);
      setPlate("");
      setDescription("");
      setEndDate("");
      await fetchSpecialTariffs();
      setTimeout(() => setSuccess(""), 4000);
    }
    setIsSubmitting(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setErrorMsg("");
    const { error } = await supabase
      .from("special_tariffs")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErrorMsg("Error al cambiar estado: " + error.message);
    } else {
      await fetchSpecialTariffs();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setErrorMsg("");
    const { error } = await supabase.from("special_tariffs").delete().eq("id", id);

    if (error) {
      setErrorMsg("Error al eliminar tarifa especial: " + error.message);
    } else {
      setSuccess("Tarifa especial eliminada exitosamente");
      await fetchSpecialTariffs();
      setTimeout(() => setSuccess(""), 3000);
    }
    setDeletingId(null);
  };

  const RATE_LABELS: Record<string, string> = {
    dia: "Día (12:00 a.m. a 12:00 a.m.)",
    hora: "Por Hora",
    minuto: "Por Minuto",
    fijo: "Cobro Fijo Único",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Spinner size={32} className="text-indigo-600 mb-4" />
        <p>Cargando tarifas especiales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Tarifas Especiales por Placa
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Asigna cobros personalizados a vehículos específicos a partir de una fecha determinada.
          </p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-3xl hidden md:block">
          <Tag size={28} />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-3xl flex items-center gap-3">
          <CheckCircle2 size={20} className="shrink-0" />
          <p className="text-sm font-bold">{success}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl sticky top-28 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus size={20} className="text-amber-500" />
              Nueva Tarifa Especial
            </h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Placa del Vehículo *
                </label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Ej. ABC123"
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Cobro *
                </label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  required
                >
                  <option value="dia">Día ($ por día 00:00 a 24:00)</option>
                  <option value="hora">Por Hora</option>
                  <option value="minuto">Por Minuto</option>
                  <option value="fijo">Cobro Fijo Único</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Valor a Cobrar ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                    placeholder="5000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-xs rounded-2xl px-3 py-2.5 outline-none font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Fecha Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-xs rounded-2xl px-3 py-2.5 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Observación / Motivo
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Convenio o tarifa especial"
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-3xl px-5 py-3.5 font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? <Spinner size={18} className="text-white" /> : <Plus size={18} />}
                Guardar Tarifa Especial
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Tarifas Especiales */}
        <div className="lg:col-span-2 space-y-4">
          {specialTariffs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <Tag size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No hay tarifas especiales registradas.</p>
              <p className="text-sm text-slate-400 mt-1">
                Agrega una tarifa especial rellenando el formulario.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {specialTariffs.map((st) => (
                <div
                  key={st.id}
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    st.is_active ? "border-amber-200 shadow-md" : "border-slate-100 opacity-60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 font-black rounded-xl text-lg tracking-wider">
                        {st.plate}
                      </span>
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl">
                        {RATE_LABELS[st.rate_type] || st.rate_type}
                      </span>
                      {!st.is_active && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-lg">
                          Inactiva
                        </span>
                      )}
                    </div>

                    <p className="text-2xl font-black text-slate-900 pt-1">
                      ${Number(st.amount).toLocaleString("es-CO")}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar size={13} className="text-slate-400" />
                        Desde: {new Date(st.start_date).toLocaleDateString("es-CO")}
                      </span>
                      {st.end_date ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={13} className="text-slate-400" />
                          Hasta: {new Date(st.end_date).toLocaleDateString("es-CO")}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Indefinido</span>
                      )}
                    </div>

                    {st.description && (
                      <p className="text-xs text-slate-600 italic pt-1">
                        &quot;{st.description}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(st.id, st.is_active)}
                      className="p-2.5 rounded-2xl text-slate-500 hover:bg-slate-100 transition-all"
                      title={st.is_active ? "Desactivar" : "Activar"}
                    >
                      {st.is_active ? (
                        <ToggleRight size={26} className="text-amber-500" />
                      ) : (
                        <ToggleLeft size={26} className="text-slate-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(st.id)}
                      disabled={deletingId === st.id}
                      className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-red-500 transition-all border border-slate-100"
                      title="Eliminar"
                    >
                      {deletingId === st.id ? (
                        <Spinner size={18} className="text-white" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
