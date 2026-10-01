"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LogIn, LogOut, Clock, Activity, Copy, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function EmployeeLogs({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_logs")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          setTableExists(false);
        } else {
          console.error("Error fetching employee logs:", error);
        }
        setLogs([]);
      } else {
        setTableExists(true);
        setLogs(data || []);
      }
    } catch (e) {
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const sqlCode = `CREATE TABLE IF NOT EXISTS public.employee_logs (
    id uuid not null default gen_random_uuid(),
    parking_lot_id uuid null,
    employee_name text null,
    action text null,
    created_at timestamp with time zone null default now(),
    constraint employee_logs_pkey primary key (id)
);

ALTER TABLE public.employee_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full logs" ON public.employee_logs;
CREATE POLICY "Public full logs" ON public.employee_logs FOR ALL USING (true) WITH CHECK (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="font-bold text-sm">Cargando registros de turnos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Registro de Turnos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Historial de aperturas y cierres de sesión de los operarios.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors border border-slate-200"
          title="Actualizar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {!tableExists ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-950">
                Falta configurar la tabla de turnos en Supabase
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Para que el sistema guarde el historial de quién inicia y finaliza turno, debes ejecutar el siguiente código SQL en tu editor de Supabase una sola vez:
              </p>
            </div>
          </div>

          <div className="relative bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner">
            <button
              onClick={copySql}
              className="absolute top-3 right-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? "¡Copiado!" : "Copiar SQL"}
            </button>
            <pre className="pr-24">{sqlCode}</pre>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-700 text-base">
                Aún no hay inicios de turno registrados.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                A medida que los operarios ingresen su nombre al iniciar sesión, sus turnos aparecerán en esta lista.
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
      )}
    </div>
  );
}
