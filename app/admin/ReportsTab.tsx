"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart2,
  Download,
  Car,
  TrendingUp,
  Trophy,
  Calendar,
  RefreshCw,
  Hash,
} from "lucide-react";

type Periodo = "semana" | "mes" | "mes_pasado" | "personalizado";

interface ResumenTipo {
  tipo: string;
  cantidad: number;
  total: number;
}

interface PlacaFrecuente {
  placa: string;
  tipo: string;
  visitas: number;
  total_pagado: number;
}

const ETIQUETAS_TIPO: Record<string, string> = {
  motos: "Motos",
  carros: "Carros",
  bicicletas: "Bicicletas",
  camionetas: "Camionetas",
  camiones: "Camiones",
};

const COLORES_TIPO: Record<string, string> = {
  motos: "bg-blue-100 text-blue-700",
  carros: "bg-indigo-100 text-indigo-700",
  bicicletas: "bg-emerald-100 text-emerald-700",
  camionetas: "bg-amber-100 text-amber-700",
  camiones: "bg-orange-100 text-orange-700",
};

function formatCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);
}

function calcularRangoPeriodo(periodo: Periodo, desde: string, hasta: string) {
  const hoy = new Date();
  let inicio: Date;
  let fin: Date;

  switch (periodo) {
    case "semana": {
      inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    }
    case "mes": {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    }
    case "mes_pasado": {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case "personalizado": {
      inicio = desde ? new Date(desde + "T00:00:00") : new Date();
      fin = hasta ? new Date(hasta + "T23:59:59") : new Date();
      break;
    }
  }

  return { inicio, fin };
}

export default function ReportsTab({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [resumenTipos, setResumenTipos] = useState<ResumenTipo[]>([]);
  const [placasFrecuentes, setPlacasFrecuentes] = useState<PlacaFrecuente[]>([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalSesiones, setTotalSesiones] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  const fetchReportes = useCallback(async () => {
    setLoading(true);
    try {
      const { inicio, fin } = calcularRangoPeriodo(periodo, fechaDesde, fechaHasta);

      // ── Consulta 1: Resumen por tipo de vehículo ──
      const { data: sesiones } = await supabase
        .from("parking_sessions")
        .select("total_charged, vehicles(type, plate)")
        .eq("parking_lot_id", parkingLotId)
        .eq("status", "completed")
        .gte("exit_time", inicio.toISOString())
        .lte("exit_time", fin.toISOString());

      if (sesiones) {
        // Agrupar por tipo
        const mapasTipo: Record<string, { cantidad: number; total: number }> = {};
        const mapaPlacas: Record<string, { tipo: string; visitas: number; total_pagado: number }> = {};

        sesiones.forEach((s: any) => {
          const tipo = s.vehicles?.type || "desconocido";
          const placa = s.vehicles?.plate || "N/A";
          const cobrado = Number(s.total_charged) || 0;

          // Por tipo
          if (!mapasTipo[tipo]) mapasTipo[tipo] = { cantidad: 0, total: 0 };
          mapasTipo[tipo].cantidad += 1;
          mapasTipo[tipo].total += cobrado;

          // Por placa
          if (!mapaPlacas[placa]) mapaPlacas[placa] = { tipo, visitas: 0, total_pagado: 0 };
          mapaPlacas[placa].visitas += 1;
          mapaPlacas[placa].total_pagado += cobrado;
        });

        // Convertir a arrays ordenados
        const resumen: ResumenTipo[] = Object.entries(mapasTipo)
          .map(([tipo, datos]) => ({ tipo, ...datos }))
          .sort((a, b) => b.total - a.total);

        const placas: PlacaFrecuente[] = Object.entries(mapaPlacas)
          .map(([placa, datos]) => ({ placa, ...datos }))
          .sort((a, b) => b.visitas - a.visitas)
          .slice(0, 10);

        const sumaTotal = resumen.reduce((acc, r) => acc + r.total, 0);
        const sumaSesiones = resumen.reduce((acc, r) => acc + r.cantidad, 0);

        setResumenTipos(resumen);
        setPlacasFrecuentes(placas);
        setTotalGeneral(sumaTotal);
        setTotalSesiones(sumaSesiones);
      }
    } catch (e) {
      console.error("Error al cargar reportes:", e);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId, periodo, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  /**
   * Exporta los datos del reporte a un archivo CSV descargable.
   */
  const exportarCSV = async () => {
    setExportando(true);
    try {
      const { inicio, fin } = calcularRangoPeriodo(periodo, fechaDesde, fechaHasta);

      const { data } = await supabase
        .from("parking_sessions")
        .select("entry_time, exit_time, total_charged, vehicles(plate, type)")
        .eq("parking_lot_id", parkingLotId)
        .eq("status", "completed")
        .gte("exit_time", inicio.toISOString())
        .lte("exit_time", fin.toISOString())
        .order("exit_time", { ascending: false });

      if (!data) return;

      // Construir CSV
      const encabezado = ["Placa", "Tipo", "Entrada", "Salida", "Cobrado (COP)"];
      const filas = data.map((s: any) => [
        s.vehicles?.plate || "N/A",
        s.vehicles?.type || "N/A",
        s.entry_time ? new Date(s.entry_time).toLocaleString("es-CO") : "",
        s.exit_time ? new Date(s.exit_time).toLocaleString("es-CO") : "",
        s.total_charged || 0,
      ]);

      const csvContent =
        [encabezado, ...filas]
          .map((fila) => fila.map((v) => `"${v}"`).join(","))
          .join("\n");

      // Crear blob y descargar
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `reporte_${periodo}_${new Date().toISOString().split("T")[0]}.csv`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error al exportar CSV:", e);
    } finally {
      setExportando(false);
    }
  };

  const etiquetaPeriodo: Record<Periodo, string> = {
    semana: "Últimos 7 días",
    mes: "Este mes",
    mes_pasado: "Mes pasado",
    personalizado: "Período personalizado",
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-2xl">
            <BarChart2 size={24} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Reportes y Estadísticas</h2>
            <p className="text-sm text-slate-500">
              Análisis de ingresos y vehículos por período
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportes}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition-all"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button
            onClick={exportarCSV}
            disabled={exportando || loading || totalSesiones === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {exportando ? "Exportando..." : "Exportar CSV"}
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Período
            </label>
            <div className="flex flex-wrap gap-2">
              {(["semana", "mes", "mes_pasado", "personalizado"] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-2xl text-sm font-bold transition-all ${
                    periodo === p
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {etiquetaPeriodo[p]}
                </button>
              ))}
            </div>
          </div>

          {periodo === "personalizado" && (
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Tarjetas de resumen general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <Car size={28} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Sesiones
                </p>
                <p className="text-3xl font-black text-slate-900 mt-0.5">
                  {totalSesiones.toLocaleString("es-CO")}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <TrendingUp size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recaudo Total
                </p>
                <p className="text-3xl font-black text-emerald-700 mt-0.5">
                  {formatCOP(totalGeneral)}
                </p>
              </div>
            </div>
          </div>

          {totalSesiones === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <BarChart2 size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="font-bold text-slate-600 text-base">
                No hay datos para el período seleccionado.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Intenta con un período diferente o más amplio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resumen por tipo de vehículo */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <Car size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Por Tipo de Vehículo</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {resumenTipos.map((item) => {
                    const porcentaje =
                      totalGeneral > 0
                        ? Math.round((item.total / totalGeneral) * 100)
                        : 0;
                    const colorClase =
                      COLORES_TIPO[item.tipo] || "bg-slate-100 text-slate-700";

                    return (
                      <div key={item.tipo} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${colorClase}`}
                            >
                              {ETIQUETAS_TIPO[item.tipo] || item.tipo}
                            </span>
                            <span className="text-sm text-slate-500">
                              {item.cantidad.toLocaleString("es-CO")} sesiones
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 text-sm">
                              {formatCOP(item.total)}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              {porcentaje}%
                            </span>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 10 placas más frecuentes */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <Trophy size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-800">Top 10 Placas Frecuentes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Placa
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-1">
                            <Hash size={11} />
                            Visitas
                          </div>
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {placasFrecuentes.map((p, idx) => (
                        <tr key={p.placa} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                idx === 0
                                  ? "bg-amber-400 text-white"
                                  : idx === 1
                                  ? "bg-slate-300 text-white"
                                  : idx === 2
                                  ? "bg-orange-400 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-black text-slate-800 tracking-widest">
                            {p.placa.toUpperCase()}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                                COLORES_TIPO[p.tipo] || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {ETIQUETAS_TIPO[p.tipo] || p.tipo}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-700">
                            {p.visitas}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-700 text-sm">
                            {formatCOP(p.total_pagado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pie de página informativo */}
      <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
        <Calendar size={13} />
        <span>
          Los datos corresponden únicamente a sesiones <strong>completadas</strong> en el período seleccionado.
        </span>
      </div>
    </div>
  );
}
