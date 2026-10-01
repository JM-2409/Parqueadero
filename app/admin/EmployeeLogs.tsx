"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Fingerprint, LogIn, LogOut, Clock, Activity } from "lucide-react";

export default function EmployeeLogs({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    // We try to fetch from employee_logs. If it fails, they need to create the table.
    try {
      const { data, error } = await supabase
        .from("employee_logs")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
    } catch (e) {
      // Si la tabla no existe, el bloque inferior muestra las instrucciones de creación
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
          Registro de Turnos / Empleados
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Activity size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-700 text-base">
              No hay registros de turnos recientes.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Los inicios y salidas de turno de los operarios aparecerán aquí cuando inicien sesión.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Operario</th>
                  <th className="px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-slate-900 font-bold">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">
                      {log.employee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-3xl text-[11px] font-bold uppercase tracking-wider ${
                          log.action === "login"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {log.action === "login" ? (
                          <LogIn size={12} />
                        ) : (
                          <LogOut size={12} />
                        )}
                        {log.action === "login"
                          ? "Inició Turno"
                          : "Finalizó/Cambió Turno"}
                      </span>
                    </td>
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
