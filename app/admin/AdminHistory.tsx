"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  History,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Car,
  User,
  Palette,
  Tag,
  X,
  Trash2,
  Edit2,
} from "lucide-react";
import { calculateFee } from "@/lib/pricing";
import { Spinner } from "@/components/ui/Spinner";
import ReceiptModal from "../employee/ReceiptModal";

const PAGE_SIZE = 20;

export default function AdminHistory({ parkingLot }: { parkingLot: any }) {
  const parkingLotId = parkingLot.id;
  const [sessions, setSessions] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [localEmployeeSearchTerm, setLocalEmployeeSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [forceExitConfig, setForceExitConfig] = useState<{
    session: any;
    customDate: string;
    customTime: string;
  } | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<any>(null);
  const [newPlate, setNewPlate] = useState("");
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setEmployeeSearchTerm(localEmployeeSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm, localEmployeeSearchTerm]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch tariffs
    const { data: tariffData } = await supabase
      .from("tariffs_v3")
      .select("*")
      .eq("parking_lot_id", parkingLotId);
    if (tariffData) setTariffs(tariffData);

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
    if (employeeSearchTerm) {
      // Search by employee name (entry or exit)
      query = query.or(
        `entry_employee_name.ilike.%${employeeSearchTerm}%,exit_employee_name.ilike.%${employeeSearchTerm}%`,
      );
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
  }, [
    parkingLotId,
    page,
    searchTerm,
    employeeSearchTerm,
    filterType,
    filterStatus,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("public:parking_sessions:admin_history")
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
    const dStr = now.toISOString().split("T")[0];
    const tStr = now.toTimeString().substring(0, 5);
    setForceExitConfig({
      session: sessionToExit,
      customDate: dStr,
      customTime: tStr,
    });
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

      const rules = tariffs.filter(
        (t) => t.vehicle_type === sessionToExit.vehicles.type,
      );
      const finalFee = calculateFee(entryTime, exitTime, rules, {
        entry_grace_period_mins: parkingLot.entry_grace_period_mins,
        shift_grace_period_mins: parkingLot.shift_grace_period_mins,
      });

      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("receipt_sequence")
        .eq("id", parkingLotId)
        .single();
      const nextSeq = (lotData?.receipt_sequence || 0) + 1;
      await supabase
        .from("parking_lots")
        .update({ receipt_sequence: nextSeq })
        .eq("id", parkingLotId);

      const receiptNumber = `REC-${nextSeq.toString().padStart(6, "0")}`;
      const durationMinutes = Math.round(
        (exitTime.getTime() - entryTime.getTime()) / 60000,
      );

      const { data: updatedSession, error: updateError } = await supabase
        .from("parking_sessions")
        .update({
          status: "completed",
          exit_time: exitTime.toISOString(),
          fee: finalFee,
          total_charged: finalFee,
          receipt_number: receiptNumber,
          duration_minutes: durationMinutes,
          exit_employee_name: "Admin",
        })
        .eq("id", sessionToExit.id)
        .select("*, vehicles(*)")
        .single();

      if (!updateError && updatedSession) {
        fetchData(); // Reload list
        setViewingReceipt(updatedSession);
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al forzar salida.");
    }
    setIsSubmittingExit(null);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const { error } = await supabase
        .from("parking_sessions")
        .delete()
        .eq("id", sessionToDelete);

      if (error) throw error;
      setSessionToDelete(null);
      fetchData(); // Reload
    } catch (e) {
      console.error(e);
      alert("Hubo un error al eliminar el registro.");
    }
  };

  const handleSaveEditReceipt = async () => {
    if (!sessionToEdit || !newPlate.trim()) return;
    setIsEditingPlate(true);
    try {
      const uppercasePlate = newPlate.trim().toUpperCase();

      // Check if vehicle with new plate already exists
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", uppercasePlate)
        .maybeSingle();

      if (existingVehicle) {
        // Just link session to this existing vehicle
        await supabase
          .from("parking_sessions")
          .update({ vehicle_id: existingVehicle.id })
          .eq("id", sessionToEdit.id);
      } else {
        // Create new vehicle with new plate (copying old properties would be better but this works) or update existing vehicle if only 1 session
        const { data: sessionsWithVehicle } = await supabase
          .from("parking_sessions")
          .select("id")
          .eq("vehicle_id", sessionToEdit.vehicle_id);

        if (sessionsWithVehicle && sessionsWithVehicle.length === 1) {
          // It's safe to update the vehicle directly since only this session relies on it
          await supabase
            .from("vehicles")
            .update({ plate: uppercasePlate })
            .eq("id", sessionToEdit.vehicle_id);
        } else {
          // Create new vehicle
          const { data: newV } = await supabase
            .from("vehicles")
            .insert([
              {
                plate: uppercasePlate,
                type: sessionToEdit.vehicles.type,
                brand: sessionToEdit.vehicles.brand,
                color: sessionToEdit.vehicles.color,
                owner_name: sessionToEdit.vehicles.owner_name,
              },
            ])
            .select()
            .single();

          if (newV) {
            await supabase
              .from("parking_sessions")
              .update({ vehicle_id: newV.id })
              .eq("id", sessionToEdit.id);
          }
        }
      }

      setSessionToEdit(null);
      setNewPlate("");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Hubo un error al editar la placa.");
    } finally {
      setIsEditingPlate(false);
    }
  };

  const calculateCurrentFee = (session: any) => {
    if (session.status === "completed")
      return session.total_charged || session.fee;

    const entryTime = new Date(session.entry_time);
    const exitTime = new Date(); // Current time
    const rules = tariffs.filter(
      (t) => t.vehicle_type === session.vehicles.type,
    );

    return calculateFee(entryTime, exitTime, rules, {
      entry_grace_period_mins: parkingLot.entry_grace_period_mins,
      shift_grace_period_mins: parkingLot.shift_grace_period_mins,
    });
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("parking_sessions")
        .select(
          `
          *,
          vehicles!inner (*)
        `,
        )
        .eq("parking_lot_id", parkingLotId)
        .order("entry_time", { ascending: false });

      if (searchTerm) {
        query = query.ilike("vehicles.plate", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No hay datos para exportar.");
        setIsExporting(false);
        return;
      }

      // Extract custom field names
      const publicCustomFields = (parkingLot?.custom_fields || []).map(
        (f: any) => f.name,
      );
      const privateCustomFieldsObj = (
        parkingLot?.private_custom_fields || []
      ).map((f: any) => f.name);
      const dynamicFields = Array.from(
        new Set([...publicCustomFields, ...privateCustomFieldsObj]),
      );

      // Generate CSV content
      const headers = [
        "Ticket",
        "Placa",
        "Tipo",
        "Ingreso",
        "Salida",
        "Atendido Por (Ingreso)",
        "Atendido Por (Salida)",
        "Estado",
        "Valor Cobrado",
        ...dynamicFields,
        "Otros Extras",
      ];

      const csvRows = [headers.join(",")];

      for (const row of data) {
        const isCompleted = row.status === "completed";
        const entryDate = new Date(row.entry_time).toLocaleString();
        const exitDate = isCompleted
          ? new Date(row.exit_time).toLocaleString()
          : "-";

        const allExtras = {
          ...row.vehicles?.custom_fields_data,
          ...row.extra_data,
        };

        const dynamicValues = dynamicFields.map((field) => {
          const val = allExtras[field] || "";
          delete allExtras[field];
          return `"${val}"`;
        });

        let extras = "";
        if (Object.keys(allExtras).length > 0) {
          extras = Object.entries(allExtras)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ");
        }

        const csvRow = [
          `"${row.receipt_number || "-"}"`,
          `"${row.vehicles?.plate || ""}"`,
          `"${row.vehicles?.type || ""}"`,
          `"${entryDate}"`,
          `"${exitDate}"`,
          `"${row.entry_employee_name || ""}"`,
          `"${row.exit_employee_name || ""}"`,
          `"${row.status === "completed" ? "Completado" : "Activo"}"`,
          `"${row.total_charged || row.fee || 0}"`,
          ...dynamicValues,
          `"${extras}"`,
        ];

        csvRows.push(csvRow.join(","));
      }

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `historial_parqueadero_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`,
      );
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
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 mt-8 relative group hover:border-blue-100 transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <History size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Historial de Vehículos
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Registro de ingresos y salidas
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={exportToCSV}
              disabled={isExporting || sessions.length === 0}
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-md text-sm"
            >
              <FileText size={18} />
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 border-b border-slate-100 mb-6 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-6 py-2.5 font-bold text-sm rounded-2xl transition-all whitespace-nowrap ${filterStatus === "active" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            En Sistema
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-6 py-2.5 font-bold text-sm rounded-2xl transition-all whitespace-nowrap ${filterStatus === "completed" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            Salieron (Completados)
          </button>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-6 py-2.5 font-bold text-sm rounded-2xl transition-all whitespace-nowrap ${filterStatus === "all" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            Todos
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-slate-50/50 p-2 sm:p-4 rounded-3xl border border-slate-100/50">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Placa..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm w-full font-bold uppercase transition-all shadow-md"
            />
          </div>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Operario..."
              value={localEmployeeSearchTerm}
              onChange={(e) => setLocalEmployeeSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm w-full transition-all shadow-md"
            />
          </div>
          <div className="relative">
            <Car
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm w-full appearance-none transition-all shadow-md"
            >
              <option value="all">Todos los vehículos</option>
              <option value="motos">Motos</option>
              <option value="carros">Carros</option>
              <option value="bicicletas">Bicicletas</option>
              <option value="camionetas">Camionetas</option>
              <option value="camiones">Camiones</option>
            </select>
            <ChevronLeft
              size={14}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none -rotate-90"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm w-full text-slate-600 transition-all shadow-md font-medium"
            title="Fecha Inicio"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm w-full text-slate-600 transition-all shadow-md font-medium"
            title="Fecha Fin"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
            <Spinner className="text-blue-500 w-8 h-8" />
            <span className="font-medium text-sm tracking-wide">
              Cargando historial...
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-md bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-5 font-bold">Ticket</th>
                  <th className="p-5 font-bold">Placa</th>
                  <th className="p-5 font-bold hidden md:table-cell">Tipo</th>
                  <th className="p-5 font-bold">Ingreso</th>
                  <th className="p-5 font-bold">Salida</th>
                  <th className="p-5 font-bold hidden lg:table-cell">
                    Operador
                  </th>
                  <th className="p-5 font-bold hidden md:table-cell">Extra</th>
                  <th className="p-5 font-bold">Estado</th>
                  <th className="p-5 font-bold">Valor</th>
                  <th className="p-5 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map((session) => {
                  const isCompleted = session.status === "completed";
                  const currentFee = calculateCurrentFee(session);

                  return (
                    <React.Fragment key={session.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${expandedRow === session.id ? "bg-blue-50/30" : ""}`}
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === session.id ? null : session.id,
                          )
                        }
                      >
                        <td className="p-5 text-slate-500 font-mono text-xs font-medium">
                          {session.receipt_number || "-"}
                        </td>
                        <td className="p-5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                            {session.vehicles.plate}
                          </span>
                          {expandedRow !== session.id && (
                            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider md:hidden mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              Ver más
                            </div>
                          )}
                        </td>
                        <td className="p-5 text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest hidden md:table-cell">
                          {session.vehicles.type}
                        </td>
                        <td className="p-5 text-slate-600 font-medium">
                          {new Date(session.entry_time).toLocaleString(
                            undefined,
                            {
                              dateStyle: "short",
                              timeStyle: "short",
                            },
                          )}
                        </td>
                        <td className="p-5 text-slate-600 font-medium">
                          {isCompleted ? (
                            new Date(session.exit_time).toLocaleString(
                              undefined,
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              },
                            )
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-5 text-slate-600 hidden lg:table-cell">
                          <div className="text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-1">
                              In:
                            </span>
                            <span className="font-medium text-slate-700">
                              {session.entry_employee_name || "N/A"}
                            </span>
                          </div>
                          {isCompleted && (
                            <div className="text-xs mt-1.5">
                              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-1">
                                Out:
                              </span>
                              <span className="font-medium text-slate-700">
                                {session.exit_employee_name || "N/A"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-5 text-slate-600 hidden md:table-cell">
                          {Object.keys({
                            ...session.vehicles?.custom_fields_data,
                            ...session.extra_data,
                          }).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-[150px]">
                              {Object.entries({
                                ...session.vehicles?.custom_fields_data,
                                ...session.extra_data,
                              }).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-1 rounded-md text-slate-500 truncate"
                                  title={`${k}: ${v}`}
                                >
                                  {k}: {v as string}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-medium">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-5">
                          <span
                            className={`px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-slate-100 text-slate-500"
                                : "bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-100"
                            }`}
                          >
                            {isCompleted ? "Completado" : "En Sistema"}
                          </span>
                        </td>
                        <td className="p-5 font-black text-slate-900 text-sm tracking-tight border-l border-slate-50 bg-slate-50/30">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <span>{formatCurrency(currentFee)}</span>
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
                            formatCurrency(currentFee)
                          )}
                        </td>
                        <td className="p-5">
                          {!isCompleted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExit(session);
                              }}
                              disabled={isSubmittingExit === session.id}
                              className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-blue-200 disabled:opacity-50 flex items-center justify-center min-w-[100px] w-full"
                            >
                              {isSubmittingExit === session.id ? (
                                <Spinner className="w-4 h-4" />
                              ) : (
                                "Salida Forzada"
                              )}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {expandedRow === session.id && (
                        <tr className="bg-blue-50/30 border-b border-slate-100">
                          <td colSpan={10} className="p-4 px-6 relative">
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

                              <div className="space-y-3 flex flex-col justify-start items-end">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full text-right">
                                  Acciones
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToEdit(session);
                                    setNewPlate(session.vehicles.plate);
                                  }}
                                  className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl text-xs font-bold transition-colors flex items-center gap-2 mb-2 w-full justify-center md:justify-end"
                                >
                                  <Edit2 size={16} />
                                  Editar Placa
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete(session.id);
                                  }}
                                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl text-xs font-bold transition-colors flex items-center gap-2 w-full justify-center md:justify-end"
                                >
                                  <Trash2 size={16} />
                                  Borrar Registro
                                </button>
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
      </div>

      {/* Modal Salida Forzada */}
      {forceExitConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                Forzar Salida: {forceExitConfig.session.vehicles.plate}
              </h3>
              <button
                onClick={() => setForceExitConfig(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-2xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Ingresa la fecha y hora exacta de salida. Si dejas esto como
                  está, se utilizará la hora actual.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Salida
                </label>
                <input
                  type="date"
                  value={forceExitConfig.customDate}
                  onChange={(e) =>
                    setForceExitConfig({
                      ...forceExitConfig,
                      customDate: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 w-full outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hora de Salida (24h)
                </label>
                <input
                  type="time"
                  value={forceExitConfig.customTime}
                  onChange={(e) =>
                    setForceExitConfig({
                      ...forceExitConfig,
                      customTime: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 w-full outline-none"
                />
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setForceExitConfig(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmForceExit}
                className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors flex items-center justify-center min-w-[120px]"
              >
                Confirmar Salida
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-2">
                Borrar Registro
              </h3>
              <p className="text-sm text-slate-500">
                ¿Estás seguro de que deseas eliminar permanentemente este
                registro? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-center">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-2xl transition-colors w-full"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-colors w-full flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionToEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Editar Placa</h3>
              <button
                onClick={() => setSessionToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-2xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Placa
              </label>
              <input
                type="text"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono text-lg font-bold"
                placeholder="ABC-123"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-3">
                Al editar la placa, el recibo y el registro histórico se
                actualizarán para apuntar a la placa correcta.
              </p>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setSessionToEdit(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-2xl transition-colors"
                disabled={isEditingPlate}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditReceipt}
                className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors flex items-center gap-2"
                disabled={isEditingPlate || !newPlate.trim()}
              >
                {isEditingPlate ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <Edit2 size={16} />
                )}
                Guardar
              </button>
            </div>
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
    </>
  );
}
