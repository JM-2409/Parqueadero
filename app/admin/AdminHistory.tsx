"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { History, Search, FileText, ChevronLeft, ChevronRight, Car, User, Palette, Tag, X } from "lucide-react";
import { calculateFee } from "@/lib/pricing";
import { Spinner } from "@/components/ui/Spinner";

const PAGE_SIZE = 20;

export default function AdminHistory({ parkingLotId }: { parkingLotId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [forceExitConfig, setForceExitConfig] = useState<{session: any, customDate: string, customTime: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch tariffs
    const { data: tariffData } = await supabase
      .from("tariffs_v2")
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
    if (employeeSearchTerm) {
      // Search by employee name (entry or exit)
      query = query.or(`entry_employee_name.ilike.%${employeeSearchTerm}%,exit_employee_name.ilike.%${employeeSearchTerm}%`);
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
  }, [parkingLotId, page, searchTerm, employeeSearchTerm, filterType, filterStatus, dateFrom, dateTo]);

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
  }, [searchTerm, employeeSearchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExit = (sessionToExit: any) => {
    const now = new Date();
    // Default config values
    const dStr = now.toISOString().split('T')[0];
    const tStr = now.toTimeString().substring(0, 5);
    setForceExitConfig({ session: sessionToExit, customDate: dStr, customTime: tStr });
  };

  const confirmForceExit = async () => {
    if (!forceExitConfig) return;
    const { session: sessionToExit, customDate, customTime } = forceExitConfig;

    if (isSubmittingExit === sessionToExit.id) return;
    setIsSubmittingExit(sessionToExit.id);
    setForceExitConfig(null);
    
    try {
      const entryTime = new Date(sessionToExit.entry_time);
      let exitTime = new Date();
      if (customDate && customTime) {
         exitTime = new Date(`${customDate}T${customTime}:00`);
      }
      
      if (exitTime.getTime() < entryTime.getTime()) {
         alert("La fecha de salida no puede ser menor a la fecha de entrada.");
         setIsSubmittingExit(null);
         return;
      }

      const rules = tariffs.filter(t => t.vehicle_type === sessionToExit.vehicles.type);
      const finalFee = calculateFee(entryTime, exitTime, rules);

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
      alert("Hubo un error al forzar salida.");
    }
    setIsSubmittingExit(null);
  };

  const calculateCurrentFee = (session: any) => {
    if (session.status === 'completed') return session.total_charged || session.fee;
    
    const entryTime = new Date(session.entry_time);
    const exitTime = new Date(); // Current time
    const rules = tariffs.filter(t => t.vehicle_type === session.vehicles.type);
    
    return calculateFee(entryTime, exitTime, rules);
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
      const headers = ["Ticket", "Placa", "Tipo", "Marca", "Color", "Propietario", "Ingreso", "Salida", "Atendido Por (Ingreso)", "Atendido Por (Salida)", "Estado", "Valor Cobrado", "Extras"];
      
      const csvRows = [headers.join(",")];
      
      for (const row of data) {
        const isCompleted = row.status === "completed";
        const entryDate = new Date(row.entry_time).toLocaleString();
        const exitDate = isCompleted ? new Date(row.exit_time).toLocaleString() : "-";
        
        let extras = "";
        const allExtras = { ...row.vehicles?.custom_fields_data, ...row.extra_data };
        if (Object.keys(allExtras).length > 0) {
          extras = Object.entries(allExtras).map(([k, v]) => `${k}: ${v}`).join(" | ");
        }

        const csvRow = [
          `"${row.receipt_number || '-'}"`,
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
    <>
      <div className="bg-white p-6 rounded-2xl shadow-sm mt-8 relative">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Operario..."
              value={employeeSearchTerm}
              onChange={(e) => setEmployeeSearchTerm(e.target.value)}
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
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
            <Spinner />
            <span>Cargando historial...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4 font-medium rounded-tl-xl">Ticket</th>
                  <th className="p-4 font-medium">Placa</th>
                  <th className="p-4 font-medium hidden md:table-cell">Tipo</th>
                  <th className="p-4 font-medium">Ingreso</th>
                  <th className="p-4 font-medium">Salida</th>
                  <th className="p-4 font-medium hidden lg:table-cell">Atendido Por</th>
                  <th className="p-4 font-medium hidden md:table-cell">Datos Extra</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Valor</th>
                  <th className="p-4 font-medium rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => {
                  const isCompleted = session.status === "completed";
                  const currentFee = calculateCurrentFee(session);
                  
                  return (
                    <React.Fragment key={session.id}>
                      <tr 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRow === session.id ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === session.id ? null : session.id)}
                      >
                        <td className="p-4 text-slate-600 font-mono text-xs">{session.receipt_number || '-'}</td>
                        <td className="p-4 font-bold text-slate-900">
                          {session.vehicles.plate}
                          {expandedRow !== session.id && (
                            <div className="text-[10px] text-indigo-500 font-medium md:hidden mt-1">Toca para ver detalles</div>
                          )}
                        </td>
                        <td className="p-4 capitalize text-slate-600 hidden md:table-cell">{session.vehicles.type}</td>
                        <td className="p-4 text-slate-600">
                          {new Date(session.entry_time).toLocaleString()}
                        </td>
                        <td className="p-4 text-slate-600">
                          {isCompleted ? new Date(session.exit_time).toLocaleString() : "-"}
                        </td>
                        <td className="p-4 text-slate-600 hidden lg:table-cell">
                          <div className="text-xs">
                            <span className="font-semibold text-slate-500">In:</span> {session.entry_employee_name || 'N/A'}
                          </div>
                          {isCompleted && (
                            <div className="text-xs mt-1">
                              <span className="font-semibold text-slate-500">Out:</span> {session.exit_employee_name || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 hidden md:table-cell">
                          {Object.keys({ ...session.vehicles?.custom_fields_data, ...session.extra_data }).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries({ ...session.vehicles?.custom_fields_data, ...session.extra_data }).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[120px]" title={`${k}: ${v}`}>
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              isCompleted
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isCompleted ? "Completado" : "En Sistema"}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-900 text-sm">
                          {formatCurrency(currentFee)}
                        </td>
                        <td className="p-4">
                          {!isCompleted && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExit(session); }}
                              disabled={isSubmittingExit === session.id}
                              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[90px]"
                            >
                              {isSubmittingExit === session.id ? <Spinner /> : "Salida Forzada"}
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {/* Expanded details row */}
                      {expandedRow === session.id && (
                        <tr className="bg-indigo-50/30 border-b border-slate-100">
                          <td colSpan={10} className="p-4 px-6 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400"></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles del Vehículo</h4>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Car size={16} className="text-indigo-400" />
                                  <span><span className="font-medium">Marca:</span> {session.vehicles.brand || 'No registrada'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Palette size={16} className="text-indigo-400" />
                                  <span><span className="font-medium">Color:</span> {session.vehicles.color || 'No registrado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <User size={16} className="text-indigo-400" />
                                  <span><span className="font-medium">Propietario:</span> {session.vehicles.owner_name || 'No registrado'}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles Extras</h4>
                                {Object.keys({ ...session.vehicles?.custom_fields_data, ...session.extra_data }).length > 0 ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries({ ...session.vehicles?.custom_fields_data, ...session.extra_data }).map(([k, v]) => (
                                      <div key={k} className="bg-white p-2 border border-slate-200 rounded-lg flex items-start gap-2">
                                        <Tag size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <span className="text-[10px] uppercase font-bold text-slate-400">{k}</span>
                                          <span className="text-xs font-medium text-slate-800">{v as string}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400 italic">No hay datos extra registrados para este vehículo.</p>
                                )}
                              </div>
                              
                              <div className="space-y-3 lg:hidden">
                                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Atendido Por</h4>
                                 <p className="text-sm"><strong>Entrada:</strong> {session.entry_employee_name || 'N/A'}</p>
                                 {isCompleted && <p className="text-sm"><strong>Salida:</strong> {session.exit_employee_name || 'N/A'}</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
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
      
      {/* Modal Salida Forzada */}
      {forceExitConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-5 border-b border-slate-100">
               <h3 className="font-bold text-slate-900 text-lg">Forzar Salida: {forceExitConfig.session.vehicles.plate}</h3>
               <button onClick={() => setForceExitConfig(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                 <X size={20} />
               </button>
             </div>
             <div className="p-5 space-y-4">
               <div>
                 <p className="text-sm text-slate-500 mb-4">Ingresa la fecha y hora exacta de salida. Si dejas esto como está, se utilizará la hora actual.</p>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Salida</label>
                 <input 
                   type="date" 
                   value={forceExitConfig.customDate} 
                   onChange={e => setForceExitConfig({...forceExitConfig, customDate: e.target.value})}
                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Hora de Salida (24h)</label>
                 <input 
                   type="time" 
                   value={forceExitConfig.customTime} 
                   onChange={e => setForceExitConfig({...forceExitConfig, customTime: e.target.value})}
                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full outline-none"
                 />
               </div>
             </div>
             <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
               <button onClick={() => setForceExitConfig(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">
                 Cancelar
               </button>
               <button onClick={confirmForceExit} className="px-4 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[120px]">
                 Confirmar Salida
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
