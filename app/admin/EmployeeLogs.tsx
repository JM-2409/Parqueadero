"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Fingerprint,
  LogIn,
  LogOut,
  Clock,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Timer,
} from "lucide-react";

const REGISTROS_POR_PAGINA = 20;

export default function EmployeeLogs({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busquedaOperario, setBusquedaOperario] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);

  /**
   * Calcula la duración de un turno entre dos registros consecutivos.
   * Busca el login anterior al logout para el mismo empleado.
   */
  const calcularDuracion = (logActual: any, todosLogs: any[]): string | null => {
    if (logActual.action !== "logout") return null;

    // Buscar el login más reciente del mismo empleado antes de este logout
    const loginPrevio = todosLogs.find(
      (l) =>
        l.action === "login" &&
        l.user_id === logActual.user_id &&
        new Date(l.created_at) < new Date(logActual.created_at)
    );

    if (!loginPrevio) return null;

    const diff = new Date(logActual.created_at).getTime() - new Date(loginPrevio.created_at).getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Construir query con filtros
      let query = supabase
        .from("employee_logs")
        .select("*, profiles:user_id(email, full_name)", { count: "exact" })
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });

      // Filtro por fecha desde
      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        desde.setHours(0, 0, 0, 0);
        query = query.gte("created_at", desde.toISOString());
      }

      // Filtro por fecha hasta
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        query = query.lte("created_at", hasta.toISOString());
      }

      // Paginación
      const offset = (paginaActual - 1) * REGISTROS_POR_PAGINA;
      query = query.range(offset, offset + REGISTROS_POR_PAGINA - 1);

      const { data, error, count } = await query;

      if (!error && data) {
        // Filtrar por operario en el cliente (búsqueda por email/nombre)
        let filtrado = data;
        if (busquedaOperario.trim()) {
          const termino = busquedaOperario.toLowerCase().trim();
          filtrado = data.filter((log) => {
            const email = (log.profiles?.email || log.employee_name || "").toLowerCase();
            const nombre = (log.profiles?.full_name || "").toLowerCase();
            return email.includes(termino) || nombre.includes(termino);
          });
        }

        setLogs(filtrado);
        setTotalRegistros(count || 0);
      }
    } catch (e) {
      // La tabla podría no existir aún
      console.error("Error al cargar registros de turnos:", e);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId, fechaDesde, fechaHasta, paginaActual, busquedaOperario]);

  useEffect(() => {
    // Reiniciar página al cambiar filtros
    setPaginaActual(1);
  }, [busquedaOperario, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /**
   * Formatea el nombre del operario a partir del email o full_name.
   * El email tiene formato usuario@parkingapp.local, mostramos solo el usuario.
   */
  const formatearNombreOperario = (log: any): string => {
    if (log.profiles?.full_name) return log.profiles.full_name;
    if (log.profiles?.email) {
      return log.profiles.email.replace("@parkingapp.local", "");
    }
    if (log.employee_name) return log.employee_name;
    return "Desconocido";
  };

  const limpiarFiltros = () => {
    setBusquedaOperario("");
    setFechaDesde("");
    setFechaHasta("");
    setPaginaActual(1);
  };

  const hayFiltrosActivos = busquedaOperario || fechaDesde || fechaHasta;

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <Fingerprint size={24} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Registro de Turnos
            </h2>
            <p className="text-sm text-slate-500">
              Historial de inicios y cierres de sesión de los operarios
            </p>
          </div>
        </div>
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-bold underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Búsqueda por operario */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Operario
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={busquedaOperario}
                onChange={(e) => setBusquedaOperario(e.target.value)}
                placeholder="Buscar por nombre o usuario..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Desde
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Hasta
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Activity size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-700 text-base">
              No hay registros para los filtros seleccionados.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {hayFiltrosActivos
                ? "Intenta ajustar o limpiar los filtros de búsqueda."
                : "Los inicios y salidas de turno aparecerán aquí cuando los operarios inicien sesión."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-4">Fecha y Hora</th>
                    <th className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        Operario
                      </div>
                    </th>
                    <th className="px-5 py-4">Acción</th>
                    <th className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Timer size={12} />
                        Duración Turno
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log: any) => {
                    const duracion = calcularDuracion(log, logs);
                    const nombreOperario = formatearNombreOperario(log);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Fecha y hora */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <span>
                              {new Date(log.created_at).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 pl-6 mt-0.5">
                            {new Date(log.created_at).toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Nombre del operario */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <User size={14} className="text-indigo-600" />
                            </div>
                            <span className="font-bold text-slate-700">
                              {nombreOperario}
                            </span>
                          </div>
                        </td>

                        {/* Acción */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
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

                        {/* Duración del turno (solo para logouts) */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {duracion ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                              <Timer size={13} className="text-slate-500" />
                              {duracion}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Mostrando{" "}
                  <span className="font-bold text-slate-700">
                    {(paginaActual - 1) * REGISTROS_POR_PAGINA + 1}–
                    {Math.min(paginaActual * REGISTROS_POR_PAGINA, totalRegistros)}
                  </span>{" "}
                  de <span className="font-bold text-slate-700">{totalRegistros}</span> registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-bold text-slate-700 px-2">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    onClick={() =>
                      setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
