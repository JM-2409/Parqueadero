"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Home } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function PrivateSpaces({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [configFields, setConfigFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSpaces = useCallback(async () => {
    try {
      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("private_custom_fields")
        .eq("id", parkingLotId)
        .single();

      if (lotData && lotData.private_custom_fields) {
        setConfigFields(
          lotData.private_custom_fields.filter((f: any) => f.visible)
        );
      }

      const { data, error } = await supabase
        .from("private_parking_spaces")
        .select("*")
        .eq("parking_lot_id", parkingLotId);

      if (error) {
        throw error;
      } else {
        const sortedData = (data || []).sort((a, b) => {
          return String(a.space_number).localeCompare(String(b.space_number), undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
        setSpaces(sortedData);
      }
    } catch (err: any) {
      console.error("Error fetching spaces:", err);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const filteredSpaces = spaces.filter((space) => {
    const searchLower = searchQuery.toLowerCase();
    let matches = space.space_number && space.space_number.toLowerCase().includes(searchLower);

    if (!matches && space.custom_fields_data) {
        matches = Object.values(space.custom_fields_data).some((val: any) =>
            String(val).toLowerCase().includes(searchLower)
        );
    }
    return matches;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Spinner size={24} className="mx-auto" />
      </div>
    );
  }

  const carros = filteredSpaces.filter(s => s.vehicle_type !== 'motos');
  const motos = filteredSpaces.filter(s => s.vehicle_type === 'motos');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Parqueaderos Privados (Vista)
          </h3>
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar espacio, propietario, bloque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-0 text-sm text-slate-900 rounded-3xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold placeholder:font-normal transition-all"
            />
          </div>
        </div>

        {spaces.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xl">
              <Home size={32} />
            </div>
            <p className="text-slate-900 font-bold text-lg mb-1">
              No hay parqueaderos privados registrados.
            </p>
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
            No se encontraron espacios.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Carros Table */}
            {carros.length > 0 && (
              <div>
                <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Carros</h4>
                <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4 font-bold">N° Parqueadero</th>
                        {configFields.map((field) => (
                          <th key={field.name} className="px-5 py-4 font-bold">
                            {field.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {carros.map((space) => (
                        <tr key={space.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                              {space.space_number}
                            </span>
                          </td>
                          {configFields.map((field) => (
                            <td key={field.name} className="px-5 py-4 text-slate-600">
                              {space.custom_fields_data?.[field.name] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Motos Table */}
            {motos.length > 0 && (
              <div>
                <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Motos</h4>
                <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4 font-bold">N° Parqueadero</th>
                        {configFields.map((field) => (
                          <th key={field.name} className="px-5 py-4 font-bold">
                            {field.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {motos.map((space) => (
                        <tr key={space.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                              {space.space_number}
                            </span>
                          </td>
                          {configFields.map((field) => (
                            <td key={field.name} className="px-5 py-4 text-slate-600">
                              {space.custom_fields_data?.[field.name] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
