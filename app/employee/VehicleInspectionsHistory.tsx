"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  History,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  X,
  Calendar,
  Clock,
  Car,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function VehicleInspectionsHistory({
  parkingLotId,
  isAdmin = false,
}: {
  parkingLotId: string;
  isAdmin?: boolean;
}) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [expandedPlateId, setExpandedPlateId] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all inspections to group them by session.
      // If we limit, we might get partial sessions, so we fetch a large amount and limit the output later.
      const query = supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 2000 : 500); // Higher limit to get full sessions

      const { data, error } = await query;
      if (error) throw error;
      setInspections(data || []);
    } catch (err: any) {
      console.error("Error fetching inspections:", err);
    } finally {
      setLoading(false);
    }
  }, [parkingLotId, isAdmin]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Group inspections by session_id
  const groupedSessions = useMemo(() => {
    const sessionsMap = new Map<string, any>();

    // Fallback ID generator for grouping legacy inspections
    let legacyCounter = 0;
    let currentLegacySessionId = `legacy_session_${legacyCounter}`;
    let lastLegacyTime: Date | null = null;
    let lastLegacyEmployee: string | null = null;

    // First pass: sort inspections chronologically so we can group legacy ones
    const sortedInspections = [...inspections].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    sortedInspections.forEach((ins) => {
      let activeSessionId = ins.session_id;

      // Group legacy inspections heuristically if session_id is missing
      if (!activeSessionId) {
        const insTime = new Date(ins.created_at);
        const insEmployee = ins.employee_name;

        // If more than 4 hours passed or employee changed, create a new legacy session
        if (
          !lastLegacyTime ||
          !lastLegacyEmployee ||
          lastLegacyEmployee !== insEmployee ||
          insTime.getTime() - lastLegacyTime.getTime() > 4 * 60 * 60 * 1000
        ) {
          legacyCounter++;
          currentLegacySessionId = `legacy_session_${legacyCounter}`;
        }

        activeSessionId = currentLegacySessionId;
        lastLegacyTime = insTime;
        lastLegacyEmployee = insEmployee;
      }

      if (!sessionsMap.has(activeSessionId)) {
        sessionsMap.set(activeSessionId, {
          id: activeSessionId,
          employee_name: ins.employee_name.split("@")[0],
          inspections: [],
          start_time: ins.created_at,
          end_time: ins.created_at,
          isLegacy: !ins.session_id,
        });
      }

      const session = sessionsMap.get(activeSessionId);
      session.inspections.push(ins);

      // Update start/end times
      if (new Date(ins.created_at) < new Date(session.start_time))
        session.start_time = ins.created_at;
      if (new Date(ins.created_at) > new Date(session.end_time))
        session.end_time = ins.created_at;
    });

    // Convert map to array and sort by start_time descending (newest first)
    let sessionsArray = Array.from(sessionsMap.values()).sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );

    // Assign incremental "Revista X" numbers (oldest is 1, newest is N)
    const totalSessions = sessionsArray.length;
    sessionsArray = sessionsArray.map((session, index) => ({
      ...session,
      session_number: totalSessions - index,
    }));

    return { sessions: sessionsArray };
  }, [inspections]);

  const { sessions } = groupedSessions;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    // Search by employee name or any plate in the session
    if (s.employee_name.toLowerCase().includes(searchLower)) return true;
    return s.inspections.some((ins: any) =>
      ins.plate.toLowerCase().includes(searchLower),
    );
  });

  if (loading)
    return (
      <div className="py-8">
        <Spinner size={24} className="mx-auto" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Turnos de Revista
          </h3>
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa o empleado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-0 text-sm text-slate-900 rounded-3xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
            />
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xl">
              <History size={32} />
            </div>
            <p className="text-slate-900 font-bold text-lg mb-1">
              No hay revistas registradas.
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-3xl border border-dashed border-slate-100">
            No se encontraron revistas que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-white hover:bg-slate-50 transition-colors p-5 rounded-3xl border border-slate-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-lg">
                    #{session.session_number}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">
                      Revista del{" "}
                      {new Date(session.start_time).toLocaleDateString("es-CO")}{" "}
                      -{" "}
                      {new Date(session.start_time).toLocaleTimeString(
                        "es-CO",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </h4>

                    <div className="text-sm font-bold text-slate-600 mt-2 flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-100 rounded-xl">
                        Por: {session.employee_name}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 rounded-xl">
                        <Car size={14} className="inline mr-1" />{" "}
                        {session.inspections.length} vehículos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-slate-300 group-hover:text-slate-600 transition-colors hidden md:block">
                  <ChevronRight size={24} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PARA DETALLES DE SESIÓN */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Revista del{" "}
                  {new Date(selectedSession.start_time).toLocaleDateString(
                    "es-CO",
                  )}{" "}
                  -{" "}
                  {new Date(selectedSession.start_time).toLocaleTimeString(
                    "es-CO",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  Empleado: {selectedSession.employee_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setExpandedPlateId(null);
                  setSessionSearchQuery("");
                }}
                className="p-2 bg-white rounded-full hover:bg-slate-200 text-slate-500 transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="mb-4 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar placa en este turno..."
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-2xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-3">
                {selectedSession.inspections
                  .filter((ins: any) =>
                    ins.plate
                      .toLowerCase()
                      .includes(sessionSearchQuery.toLowerCase()),
                  )
                  .map((ins: any) => {
                    const isExpanded = expandedPlateId === ins.id;
                    return (
                      <div
                        key={ins.id}
                        className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden transition-all shadow-sm"
                      >
                        <button
                          onClick={() =>
                            setExpandedPlateId(isExpanded ? null : ins.id)
                          }
                          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left outline-none"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-black text-xl text-slate-800">
                              {ins.plate}
                            </span>
                            <div className="flex items-center gap-1">
                              {ins.images && ins.images.length > 0 ? (
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <ImageIcon size={10} /> {ins.images.length}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                  Sin fotos
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {ins.vehicle_type === "visitor"
                                  ? "Visitante"
                                  : "Privado"}
                              </p>
                              <p className="text-xs font-bold text-slate-400">
                                {new Date(ins.created_at).toLocaleString(
                                  "es-CO",
                                  { dateStyle: "short", timeStyle: "short" },
                                )}
                              </p>
                            </div>

                            <div className="mb-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                              <h4 className="text-xs font-black text-slate-800 mb-2 uppercase tracking-wide">
                                Observaciones
                              </h4>
                              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">
                                {ins.notes || (
                                  <span className="italic text-slate-400">
                                    No se registraron observaciones.
                                  </span>
                                )}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                                Evidencia Fotográfica
                              </h4>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {ins.images && ins.images.length > 0 ? (
                                  ins.images.map((img: string, idx: number) => (
                                    <a
                                      key={idx}
                                      href={img}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm hover:shadow-md transition-all"
                                    >
                                      <img
                                        src={img}
                                        alt={`Evidencia ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </a>
                                  ))
                                ) : (
                                  <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                                    <ImageIcon size={24} />
                                    <p className="text-xs">No hay fotos</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {selectedSession.inspections.filter((ins: any) =>
                  ins.plate
                    .toLowerCase()
                    .includes(sessionSearchQuery.toLowerCase()),
                ).length === 0 && (
                  <div className="text-center py-8 text-slate-500 font-bold bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                    No se encontraron placas que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
