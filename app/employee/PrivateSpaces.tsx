"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Home } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function PrivateSpaces({ parkingLotId }: { parkingLotId: string }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [configFields, setConfigFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSpaces = useCallback(async () => {
    try {
      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("private_custom_fields")
        .eq("id", parkingLotId)
        .single();
      
      if (lotData && lotData.private_custom_fields) {
        setConfigFields(lotData.private_custom_fields.filter((f: any) => f.visible));
      }

      const { data, error } = await supabase
        .from("private_parking_spaces")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });
      
      if (error) {
        throw error;
      } else {
        setSpaces(data || []);
      }
    } catch (err: any) {
      console.error("Error fetching spaces:", err);
      // Fail gracefully
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const filteredSpaces = spaces.filter(space => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (space.space_number && space.space_number.toLowerCase().includes(searchLower)) ||
      (space.owner_name && space.owner_name.toLowerCase().includes(searchLower)) ||
      (space.block && space.block.toLowerCase().includes(searchLower)) ||
      (space.house_or_apartment && space.house_or_apartment.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500"><Spinner size={24} className="mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-slate-900">Parqueaderos Privados</h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar espacios..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        
        {spaces.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Home size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No hay parqueaderos privados registrados.</p>
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No se encontraron espacios que coincidan con &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Parqueadero</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Bloque/Torre</th>
                  <th className="px-4 py-3">Apto/Casa</th>
                  {configFields.map(field => (
                    <th key={field.name} className="px-4 py-3">{field.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSpaces.map((space) => (
                  <tr key={space.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{space.space_number}</td>
                    <td className="px-4 py-3 text-slate-600">{space.owner_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{space.block || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{space.house_or_apartment || '-'}</td>
                    {configFields.map(field => (
                      <td key={field.name} className="px-4 py-3 text-slate-600">
                        {space.custom_fields_data?.[field.name] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
