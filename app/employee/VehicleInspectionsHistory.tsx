"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, History, Image as ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function VehicleInspectionsHistory({
  parkingLotId,
  isAdmin = false,
}: {
  parkingLotId: string;
  isAdmin?: boolean;
}) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
          query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInspections(data || []);
    } catch (err: any) {
      console.error("Error fetching inspections:", err);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const filteredInspections = inspections.filter((ins) =>
    ins.plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="py-8"><Spinner size={24} className="mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900">Historial de Revistas</h3>
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-0 text-sm text-slate-900 rounded-3xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
            />
          </div>
        </div>

        {inspections.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xl">
              <History size={32} />
            </div>
            <p className="text-slate-900 font-bold text-lg mb-1">No hay revistas registradas.</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-3xl border border-dashed border-slate-100">
            No se encontraron revistas para esa placa.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInspections.map((ins) => (
              <div key={ins.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-xl text-slate-900 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100">
                      {ins.plate}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded-lg uppercase">
                      {ins.vehicle_type === 'visitor' ? 'Visitante' : 'Privado'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-600 mb-4 line-clamp-3">
                    {ins.notes || <span className="italic text-slate-400">Sin observaciones</span>}
                  </p>
                </div>

                <div>
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {ins.images && ins.images.length > 0 ? (
                      ins.images.map((img: string, idx: number) => (
                        <a key={idx} href={img} target="_blank" rel="noreferrer" className="shrink-0 relative group">
                          <img src={img} alt="Revista" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                        </a>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <ImageIcon size={14} /> Sin fotos
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-3 border-t border-slate-200/50">
                    <span>{new Date(ins.created_at).toLocaleString('es-CO')}</span>
                    <span>{ins.employee_name.split('@')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
