"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { History, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateFee } from "@/lib/pricing";

const PAGE_SIZE = 20;

export default function AdminHistory({ parkingLotId }: { parkingLotId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch tariffs
    const { data: tariffData } = await supabase
      .from("tariffs")
      .select("*")
      .eq("parking_lot_id", parkingLotId);
    if (tariffData) setTariffs(tariffData);

    // Fetch sessions with pagination and search
    let query = supabase
      .from("parking_sessions")
      .select(`
        *,
        vehicles!inner (plate, type, brand, color, owner_name)
      `, { count: 'exact' })
      .eq("parking_lot_id", parkingLotId)
      .order("entry_time", { ascending: false });

    if (searchTerm) {
      // Search by plate
      query = query.ilike('vehicles.plate', `%${searchTerm}%`);
    }
    if (filterType !== "all") {
      query = query.eq("vehicles.type", filterType);
    }
    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (dateFrom) {
      query = query.gte("entry_time", new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const dt = new Date(dateTo);
      dt.setHours(23, 59, 59, 999);
      query = query.lte("entry_time", dt.toISOString());
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
  }, [parkingLotId, page, searchTerm, filterType, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchData]);

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

  const handleExit = async (sessionToExit: any) => {
    if (isSubmittingExit === sessionToExit.id) return;
    setIsSubmittingExit(sessionToExit.id);
    
    try {
      const entryTime = new Date(sessionToExit.entry_time);
      const exitTime = new Date();
      const tariff = tariffs.find(t => t.vehicle_type === sessionToExit.vehicles.type);
      const finalFee = calculateFee(entryTime, exitTime, tariff);

      const { data: lotData } = await supabase.from('parking_lots').select('receipt_sequence').eq('id', parkingLotId).single();
      const nextSeq = (lotData?.receipt_sequence || 0) + 1;
      await supabase.from('parking_lots').update({ receipt_sequence: nextSeq }).eq('id', parkingLotId);

      const receiptNumber = `REC-${nextSeq.toString().padStart(6, '0')}`;
      const durationMinutes = Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);

      const { error: updateError } = await supabase
        .from("parking_sessions")
        .update({
          status: "completed",
          exit_time: exitTime.toISOString(),
          fee: finalFee,
          total_charged: finalFee,
          receipt_number: receiptNumber,
          duration_minutes: durationMinutes,
          exit_employee_name: "Admin"
        })
        .eq("id", sessionToExit.id);

      if (!updateError) {
        fetchData(); // Reload list
      }
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingExit(null);
  };

  const calculateCurrentFee = (session: any) => {
    if (session.status === 'completed') return session.total_charged || session.fee;
    
    const entryTime = new Date(session.entry_time);
    const exitTime = new Date(); // Current time
    const tariff = tariffs.find(t => t.vehicle_type === session.vehicles.type);
    
    return calculateFee(entryTime, exitTime, tariff);
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("parking_sessions")
        .select(`
          *,
          vehicles!inner (plate, type, brand, color, owner_name)
        `)
        .eq("parking_lot_id", parkingLotId)
        .order("entry_time", { ascending: false });

      if (searchTerm) {
        query = query.ilike('vehicles.plate', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No hay datos para exportar.");
        setIsExporting(false);
        return;
      }

      // Generate CSV content
      const headers = ["Placa", "Tipo", "Marca", "Color", "Propietario", "Ingreso", "Salida", "Atendido Por (Ingreso)", "Atendido Por (Salida)", "Estado", "Valor Cobrado", "Extras"];
      
      const csvRows = [headers.join(",")];
      
      for (const row of data) {
        const isCompleted = row.status === "completed";
        const entryDate = new Date(row.entry_time).toLocaleString();
        const exitDate = isCompleted ? new Date(row.exit_time).toLocaleString() : "-";
        
        let extras = "";
        if (row.extra_data) {
          extras = Object.entries(row.extra_data).map(([k, v]) => `${k}: ${v}`).join(" | ");
        }

        const csvRow = [
          `"${row.vehicles.plate}"`,
          `"${row.vehicles.type}"`,
          `"${row.vehicles.brand || ''}"`,
          `"${row.vehicles.color || ''}"`,
          `"${row.vehicles.owner_name || ''}"`,
          `"${entryDate}"`,
          `"${exitDate}"`,
          `"${row.entry_employee_name || ''}"`,
          `"${row.exit_employee_name || ''}"`,
          `"${row.status}"`,
          `"${row.total_charged || row.fee || 0}"`,
          `"${extras}"`
        ];
        
        csvRows.push(csvRow.join(","));
      }
      
      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `historial_parqueadero_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Ocurrió un error al exportar los datos.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Historial de Vehículos</h2>
            <p className="text-sm text-slate-500">Registro de ingresos y salidas</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            disabled={isExporting || sessions.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FileText size={18} />
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full bg-white"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full bg-white"
        >
          <option value="all">Tipos (Todos)</option>
          <option value="motos">Motos</option>
          <option value="carros">Carros</option>
          <option value="bicicletas">Bicicletas</option>
          <option value="camionetas">Camionetas</option>
          <option value="camiones">Camiones</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full bg-white"
        >
          <option value="all">Estado (Todos)</option>
          <option value="active">Activos</option>
          <option value="completed">Completados</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full bg-white text-slate-600"
          title="Fecha Inicio"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full bg-white text-slate-600"
          title="Fecha Fin"
        />
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
                <th className="p-4 font-medium">Valor (Actual/Cobrado)</th>
                <th className="p-4 font-medium rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isCompleted = session.status === "completed";
                const currentFee = calculateCurrentFee(session);
                
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
                    <td className="p-4 font-medium text-slate-900">
                      {formatCurrency(currentFee)}
                    </td>
                    <td className="p-4">
                      {!isCompleted && (
                        <button
                          onClick={() => handleExit(session)}
                          disabled={isSubmittingExit === session.id}
                          className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isSubmittingExit === session.id ? "..." : "Dar Salida"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
