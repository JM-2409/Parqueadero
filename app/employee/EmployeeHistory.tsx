"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  User,
  Palette,
  Tag,
  FileText,
  Trash2,
} from "lucide-react";
import { calculateFee } from "@/lib/pricing";
import * as XLSX from "xlsx";
import ReceiptModal from "./ReceiptModal";

const PAGE_SIZE = 20;

export default function EmployeeHistory({
  parkingLot,
  tariffs,
  onExitSession,
}: {
  parkingLot: any;
  tariffs: any[];
  onExitSession: (sessionId: string) => void;
}) {
  const parkingLotId = parkingLot.id;
  const showRevenue = parkingLot.show_revenue;
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch sessions with pagination and search
    let query = supabase
      .from("parking_sessions")
      .select(
        `
        *,
        vehicles!inner (plate, type, brand, color, owner_name)
      `,
        { count: "exact" },
      )
      .eq("parking_lot_id", parkingLotId)
      .order("entry_time", { ascending: false });

    if (searchTerm) {
      // Search by plate
      query = query.ilike("vehicles.plate", `%${searchTerm}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: sessionData, count, error } = await query.range(from, to);

    if (error) {
      console.error("Error fetching sessions:", error);
    } else if (sessionData) {
      setSessions(sessionData);
    }

    if (count !== null) {
      setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
    }

    setLoading(false);
  }, [parkingLotId, page, searchTerm]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("public:parking_sessions:employee_history")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_sessions",
          filter: `parking_lot_id=eq.${parkingLotId}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parkingLotId, fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = async () => {
    setLoading(true);
    let allSessions = [];
    try {
      const { data, error } = await supabase
        .from("parking_sessions")
        .select(`*, vehicles!inner (plate, type, brand, color, owner_name)`)
        .eq("parking_lot_id", parkingLotId)
        .order("entry_time", { ascending: false });

      if (error) throw error;
      allSessions = data || [];
    } catch (err) {
      console.error("Error fetching data for export", err);
      setLoading(false);
      return;
    }

    const exportData = allSessions.map((session) => {
      const isCompleted = session.status === "completed";
      const rules =
        tariffs?.filter((t) => t.vehicle_type === session.vehicles?.type) || [];
      const currentFee = !isCompleted
        ? calculateFee(new Date(session.entry_time), new Date(), rules, {
            entry_grace_period_mins: parkingLot.entry_grace_period_mins,
            shift_grace_period_mins: parkingLot.shift_grace_period_mins,
          })
        : session.fee || session.total_charged || 0;

      return {
        Placa: session.vehicles?.plate || "",
        Tipo: session.vehicles?.type || "",
        Ingreso: new Date(session.entry_time).toLocaleString(),
        Salida: isCompleted
          ? new Date(session.exit_time).toLocaleString()
          : "En Sistema",
        "Atendido por (Ingreso)": session.entry_employee_name || "N/A",
        "Atendido por (Salida)": session.exit_employee_name || "N/A",
        Estado: isCompleted ? "Completado" : "En Sistema",
        Cobro: currentFee || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

    // Generar el archivo
    XLSX.writeFile(
      workbook,
      `Historial_${parkingLot.name.replace(/\s+/g, "_")}_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`,
    );
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Historial (Últimos 7 días)
            </h2>
            <p className="text-sm text-slate-500">
              Registro de ingresos y salidas recientes
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-500 outline-none text-sm w-full sm:w-64"
            />
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition-colors font-medium text-sm whitespace-nowrap"
          >
            <FileText size={16} />
            Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">
          Cargando historial...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium rounded-tl-xl">Placa</th>
                <th className="p-4 font-medium hidden md:table-cell">Tipo</th>
                <th className="p-4 font-medium">Ingreso</th>
                <th className="p-4 font-medium">Salida</th>
                <th className="p-4 font-medium hidden lg:table-cell">
                  Atendido Por
                </th>
                <th className="p-4 font-medium hidden md:table-cell">
                  Datos Extra
                </th>
                <th className="p-4 font-medium">Estado</th>
                {showRevenue && (
                  <th className="p-4 font-medium rounded-tr-xl">Cobro</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isCompleted = session.status === "completed";
                const rules =
                  tariffs?.filter(
                    (t) => t.vehicle_type === session.vehicles?.type,
                  ) || [];
                const currentFee = !isCompleted
                  ? calculateFee(
                      new Date(session.entry_time),
                      new Date(),
                      rules,
                      {
                        entry_grace_period_mins:
                          parkingLot.entry_grace_period_mins,
                        shift_grace_period_mins:
                          parkingLot.shift_grace_period_mins,
                      },
                    )
                  : 0;

                return (
                  <React.Fragment key={session.id}>
                    <tr
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRow === session.id ? "bg-blue-50/50" : ""}`}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === session.id ? null : session.id,
                        )
                      }
                    >
                      <td className="p-4 font-bold text-slate-900">
                        {session.vehicles.plate}
                        {expandedRow !== session.id && (
                          <div className="text-[10px] text-blue-500 font-medium md:hidden mt-1">
                            Toca para ver detalles
                          </div>
                        )}
                      </td>
                      <td className="p-4 capitalize text-slate-600 hidden md:table-cell">
                        {session.vehicles.type}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(session.entry_time).toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-600">
                        {isCompleted
                          ? new Date(session.exit_time).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-4 text-slate-600 hidden lg:table-cell">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-500">
                            In:
                          </span>{" "}
                          {session.entry_employee_name || "N/A"}
                        </div>
                        {isCompleted && (
                          <div className="text-xs mt-1">
                            <span className="font-semibold text-slate-500">
                              Out:
                            </span>{" "}
                            {session.exit_employee_name || "N/A"}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 hidden md:table-cell">
                        {Object.keys({
                          ...session.vehicles?.custom_fields_data,
                          ...session.extra_data,
                        }).length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {Object.entries({
                              ...session.vehicles?.custom_fields_data,
                              ...session.extra_data,
                            }).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[120px]"
                                title={`${k}: ${v}`}
                              >
                                <span className="font-medium">{k}:</span>{" "}
                                {v as string}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isCompleted
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isCompleted ? "Completado" : "En Sistema"}
                        </span>
                      </td>
                      {showRevenue && (
                        <td className="p-4 font-medium text-slate-900 text-sm">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {formatCurrency(
                                  session.fee || session.total_charged || 0,
                                )}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingReceipt(session);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="Ver Recibo"
                              >
                                <FileText size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                              {formatCurrency(currentFee)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                    {/* Expanded details row */}
                    {expandedRow === session.id && (
                      <tr className="bg-blue-50/30 border-b border-slate-100">
                        <td
                          colSpan={showRevenue ? 8 : 7}
                          className="p-4 px-6 relative"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-3 col-span-3 md:col-span-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Datos del Vehículo
                              </h4>
                              {Object.keys({
                                ...session.vehicles?.custom_fields_data,
                                ...session.extra_data,
                              }).length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries({
                                    ...session.vehicles?.custom_fields_data,
                                    ...session.extra_data,
                                  }).map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="bg-white p-2 border border-slate-200 rounded-2xl flex items-start gap-2"
                                    >
                                      <Tag
                                        size={14}
                                        className="text-slate-400 mt-0.5 flex-shrink-0"
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">
                                          {k}
                                        </span>
                                        <span className="text-xs font-medium text-slate-800">
                                          {v as string}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 italic">
                                  No hay datos extra registrados para este
                                  vehículo.
                                </p>
                              )}
                            </div>

                            <div className="space-y-3 lg:hidden">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Atendido Por
                              </h4>
                              <p className="text-sm">
                                <strong>Entrada:</strong>{" "}
                                {session.entry_employee_name || "N/A"}
                              </p>
                              {isCompleted && (
                                <p className="text-sm">
                                  <strong>Salida:</strong>{" "}
                                  {session.exit_employee_name || "N/A"}
                                </p>
                              )}
                            </div>

                            {!isCompleted && (
                              <div className="space-y-3 flex flex-col justify-start items-end">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full text-right">
                                  Acciones
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExitSession(session.id);
                                  }}
                                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-2xl text-xs font-bold transition-colors flex items-center gap-2 shadow-md"
                                >
                                  Dar Salida
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={showRevenue ? 8 : 7}
                    className="p-8 text-center text-slate-500"
                  >
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <ReceiptModal
          session={viewingReceipt}
          appSettings={null}
          parkingLot={parkingLot}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
}
