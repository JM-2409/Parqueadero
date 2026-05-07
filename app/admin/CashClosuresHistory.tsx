"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Calendar, Hash, DollarSign } from "lucide-react";

export default function CashClosuresHistory({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [closures, setClosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClosures = useCallback(async () => {
    const { data } = await supabase
      .from("cash_closures")
      .select("*, profiles:closed_by(full_name, email)")
      .eq("parking_lot_id", parkingLotId)
      .order("closed_at", { ascending: false })
      .limit(50);

    if (data) setClosures(data);
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClosures();
  }, [fetchClosures]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Historial de Cajas</h2>
      </div>

      {closures.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-md">
          <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">
            Aún no hay cierres de caja registrados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Apertura</th>
                  <th className="px-6 py-4">Cierre</th>
                  <th className="px-6 py-4">Recaudo</th>
                  <th className="px-6 py-4">Realizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closures.map((closure) => (
                  <tr
                    key={closure.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {closure.opened_at ? (
                        <div>
                          <p className="text-slate-900 font-medium flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400" />
                            {new Date(closure.opened_at).toLocaleDateString()}
                          </p>
                          <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            <Clock size={13} className="text-slate-400" />
                            {new Date(closure.opened_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          No registrado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-slate-900 font-medium flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {new Date(closure.closed_at).toLocaleDateString()}
                        </p>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                          <Clock size={13} className="text-slate-400" />
                          {new Date(closure.closed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-emerald-600 text-base">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(closure.total_revenue || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-900 font-medium">
                        {closure.profiles?.full_name ||
                          closure.notes?.split("-")[1]?.trim() ||
                          "Admin"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
