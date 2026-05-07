"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Trash2,
  AlertTriangle,
  User,
  Search,
  PlusCircle,
  Calendar,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function Blacklist({ parkingLotId }: { parkingLotId: string }) {
  const [blacklisted, setBlacklisted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [newEntry, setNewEntry] = useState({ plate: "", reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBlacklist = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blacklisted_vehicles")
      .select("*, profiles(email)")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });

    if (data) {
      setBlacklisted(data);
    } else if (error && error.code !== "42P01") {
      console.error(error);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.plate || !newEntry.reason) {
      setError("Placa y motivo son requeridos");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: insertError } = await supabase
      .from("blacklisted_vehicles")
      .insert([
        {
          parking_lot_id: parkingLotId,
          plate: newEntry.plate.toUpperCase(),
          reason: newEntry.reason,
          created_by: session?.user?.id,
        },
      ]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Vehículo vetado exitosamente");
      setNewEntry({ plate: "", reason: "" });
      fetchBlacklist();
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (id: string, plate: string) => {
    if (
      !window.confirm(
        `¿Seguro que deseas remover a ${plate} de la lista negra?`,
      )
    )
      return;

    const { error } = await supabase
      .from("blacklisted_vehicles")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(`Placa ${plate} removida de la lista negra`);
      fetchBlacklist();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const filteredList = blacklisted.filter(
    (item) =>
      item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lista Negra
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los vehículos que tienen prohibido el ingreso al
            parqueadero.
          </p>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl hidden md:block">
          <AlertTriangle size={28} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-medium">
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-slate-100 shadow-md rounded-3xl bg-white p-6 sticky top-24 h-max">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <PlusCircle size={20} className="text-red-500" />
            Vedar Vehículo
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Placa
              </label>
              <input
                type="text"
                value={newEntry.plate}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    plate: e.target.value.toUpperCase(),
                  })
                }
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none uppercase font-bold transition-all"
                placeholder="Ej: ABC123"
                maxLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Motivo / Razón
              </label>
              <textarea
                value={newEntry.reason}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, reason: e.target.value })
                }
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none min-h-[120px] resize-none transition-all"
                placeholder="Detalle de por qué se veda este vehículo..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl px-4 py-3.5 font-bold transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <Spinner size={18} className="text-white" />
              ) : (
                <AlertTriangle size={18} />
              )}
              Añadir a Lista Negra
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-100 rounded-3xl bg-white overflow-hidden flex flex-col shadow-md">
            <div className="p-6 border-b border-slate-50 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                Vehículos Vetados ({filteredList.length})
              </h3>
              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner className="text-red-500 mb-2" />
                  <p className="text-slate-500 text-sm">Cargando...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                  <AlertTriangle
                    size={32}
                    className="mx-auto text-slate-300 mb-3"
                  />
                  <p className="font-medium">
                    No hay vehículos vetados que coincidan.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredList.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-5 border border-slate-100 rounded-2xl flex flex-col gap-3 hover:border-red-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 flex-shrink-0 border border-red-100 group-hover:bg-red-100 transition-colors">
                            <span className="font-black tracking-widest">
                              {item.plate.substring(0, 3)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-xl text-slate-900 font-mono tracking-tight">
                              {item.plate}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id, item.plate)}
                          className="text-slate-300 hover:text-red-600 w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-2xl transition-colors"
                          title="Remover de lista negra"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {item.reason}
                      </p>

                      <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <User size={12} className="text-slate-400" /> Añadido
                          por:{" "}
                          {item.profiles?.email?.split("@")[0] || "Desconocido"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
