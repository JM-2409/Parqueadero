"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, AlertTriangle, User, Search, PlusCircle, Calendar } from "lucide-react";
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
    } else if (error && error.code !== '42P01') {
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

    const { data: { session } } = await supabase.auth.getSession();

    const { error: insertError } = await supabase
      .from("blacklisted_vehicles")
      .insert([{
        parking_lot_id: parkingLotId,
        plate: newEntry.plate.toUpperCase(),
        reason: newEntry.reason,
        created_by: session?.user?.id
      }]);

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
    if (!window.confirm(`¿Seguro que deseas remover a ${plate} de la lista negra?`)) return;

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

  const filteredList = blacklisted.filter(item => 
    item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}
      {success && <SuccessMessage message={success} />}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border border-slate-200 rounded-xl bg-white p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Vedar Vehículo
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
              <input 
                type="text" 
                value={newEntry.plate} 
                onChange={(e) => setNewEntry({...newEntry, plate: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ej: ABC123"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Razón</label>
              <textarea 
                value={newEntry.reason}
                onChange={(e) => setNewEntry({...newEntry, reason: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] resize-none"
                placeholder="Detalle de por qué se veda este vehículo"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-red-400"
            >
              {isSubmitting ? <Spinner size={18} className="text-white" /> : <PlusCircle size={18} />}
              Añadir a Lista Negra
            </button>
          </form>
        </div>

        <div className="md:col-span-2 border border-slate-200 rounded-xl bg-white bg-slate-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Vehículos Vetados ({filteredList.length})
            </h3>
            <div className="relative w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar placa..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-red-500 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><Spinner className="text-red-500" /></div>
            ) : filteredList.length === 0 ? (
              <div className="text-center p-8 text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
                No hay vehículos vetados que coincidan con la búsqueda.
              </div>
            ) : (
              filteredList.map((item) => (
                <div key={item.id} className="bg-white p-4 border border-slate-200 rounded-xl flex items-start gap-4 hover:border-red-200 transition-colors">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                    <span className="font-bold">{item.plate.substring(0,2)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-lg text-slate-800 font-mono">{item.plate}</h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{item.reason}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                        <User size={12} /> Añadido por: {item.profiles?.email?.split('@')[0] || 'Desconocido'}
                      </span>
                      <button 
                        onClick={() => handleRemove(item.id, item.plate)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Remover de lista negra"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
