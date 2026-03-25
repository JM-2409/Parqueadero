"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { History, Search } from "lucide-react";

export default function EmployeeHistory({ parkingLotId, showRevenue }: { parkingLotId: string, showRevenue: boolean }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch sessions from the last 7 days
    const { data: sessionData } = await supabase
      .from("parking_sessions")
      .select(`
        *,
        vehicles (plate, type, brand, color, owner_name)
      `)
      .eq("parking_lot_id", parkingLotId)
      .gte("entry_time", sevenDaysAgo.toISOString())
      .order("entry_time", { ascending: false });
    
    if (sessionData) {
      setSessions(sessionData);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [parkingLotId, fetchData]);

  const filteredSessions = sessions.filter(
    (s) =>
      s.vehicles.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vehicles.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Historial (Últimos 7 días)</h2>
            <p className="text-sm text-slate-500">Registro de ingresos y salidas recientes</p>
          </div>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-sm w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Cargando historial...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium rounded-tl-xl">Placa</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Ingreso</th>
                <th className="p-4 font-medium">Salida</th>
                <th className="p-4 font-medium">Atendido Por</th>
                <th className="p-4 font-medium">Datos Extra</th>
                <th className="p-4 font-medium">Estado</th>
                {showRevenue && <th className="p-4 font-medium rounded-tr-xl">Cobro</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.map((session) => {
                const isCompleted = session.status === "completed";
                
                return (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{session.vehicles.plate}</td>
                    <td className="p-4 capitalize text-slate-600">{session.vehicles.type}</td>
                    <td className="p-4 text-slate-600">
                      {new Date(session.entry_time).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-600">
                      {isCompleted ? new Date(session.exit_time).toLocaleString() : "-"}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-500">In:</span> {session.entry_employee_name || 'N/A'}
                      </div>
                      {isCompleted && (
                        <div className="text-xs mt-1">
                          <span className="font-semibold text-slate-500">Out:</span> {session.exit_employee_name || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      {session.extra_data && Object.keys(session.extra_data).length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {Object.entries(session.extra_data).map(([k, v]) => (
                            <span key={k} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 truncate max-w-[150px]" title={`${k}: ${v}`}>
                              <span className="font-medium">{k}:</span> {v as string}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          isCompleted
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isCompleted ? "Completado" : "En Sistema"}
                      </span>
                    </td>
                    {showRevenue && (
                      <td className="p-4 font-medium text-slate-900">
                        {isCompleted ? formatCurrency(session.fee || session.total_charged || 0) : "-"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={showRevenue ? 8 : 7} className="p-8 text-center text-slate-500">
                    No se encontraron registros en los últimos 7 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
