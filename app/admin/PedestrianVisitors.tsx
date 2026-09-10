"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/error";
import { UserCheck, UserX, Clock, Plus, X, Check, History, LogIn, LogOut } from "lucide-react";

interface Visitor {
  id: string;
  visitor_name: string;
  visitor_document?: string;
  apartment: string;
  resident_name?: string;
  purpose?: string;
  entry_time: string;
  exit_time?: string;
  status: "inside" | "exited";
  registered_by?: string;
  notes?: string;
}

const PURPOSES = ["Visita familiar", "Servicio técnico", "Delivery / Domicilio", "Mantenimiento", "Otro"];

const EMPTY: Omit<Visitor, "id" | "entry_time" | "status"> = {
  visitor_name: "", visitor_document: "", apartment: "", resident_name: "", purpose: "Visita familiar", notes: "",
};

function elapsedTime(entryTime: string) {
  const diff = Math.floor((Date.now() - new Date(entryTime).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

interface Props { parkingLotId: string; employeeName: string; }

export default function PedestrianVisitors({ parkingLotId, employeeName }: Props) {
  const [inside, setInside] = useState<Visitor[]>([]);
  const [history, setHistory] = useState<Visitor[]>([]);
  const [tab, setTab] = useState<"inside" | "history">("inside");
  const [loading, setLoading] = useState(true);
  const [histDate, setHistDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  // Reloj para actualizar elapsed time cada 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchInside = useCallback(async () => {
    const { data } = await supabase.from("pedestrian_visitors").select("*")
      .eq("parking_lot_id", parkingLotId).eq("status", "inside")
      .order("entry_time", { ascending: false });
    setInside(data || []);
    setLoading(false);
  }, [parkingLotId]);

  const fetchHistory = useCallback(async () => {
    const dayStart = `${histDate}T00:00:00`;
    const dayEnd = `${histDate}T23:59:59`;
    const { data } = await supabase.from("pedestrian_visitors").select("*")
      .eq("parking_lot_id", parkingLotId)
      .gte("entry_time", dayStart).lte("entry_time", dayEnd)
      .order("entry_time", { ascending: false });
    setHistory(data || []);
  }, [parkingLotId, histDate]);

  useEffect(() => { fetchInside(); }, [fetchInside]);
  useEffect(() => { if (tab === "history") fetchHistory(); }, [tab, fetchHistory]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`pedestrian:${parkingLotId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedestrian_visitors",
        filter: `parking_lot_id=eq.${parkingLotId}` }, () => { fetchInside(); if (tab === "history") fetchHistory(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [parkingLotId, tab, fetchInside, fetchHistory]);

  const handleRegister = async () => {
    if (!form.visitor_name.trim() || !form.apartment.trim()) { setError("Nombre y apartamento son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const { error: e } = await supabase.from("pedestrian_visitors").insert([{
        ...form, parking_lot_id: parkingLotId, status: "inside",
        entry_time: new Date().toISOString(), registered_by: employeeName,
      }]);
      if (e) throw e;
      setForm(EMPTY); setShowForm(false); fetchInside();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleExit = async (id: string) => {
    setExitingId(id);
    const { error: e } = await supabase.from("pedestrian_visitors").update({
      status: "exited", exit_time: new Date().toISOString(),
    }).eq("id", id);
    if (e) setError(getErrorMessage(e));
    setExitingId(null); fetchInside(); if (tab === "history") fetchHistory();
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.65rem 1rem", width: "100%", outline: "none", fontFamily: "inherit", fontSize: "0.875rem" };
  const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.3rem" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <UserCheck size={22} style={{ color: "#34d399" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Visitantes Peatonales</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>
              <span className="font-bold" style={{ color: "#34d399" }}>{inside.length}</span> dentro del conjunto ahora
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancelar" : "Registrar entrada"}
        </button>
      </div>

      {error && <div className="alert-error text-sm">{error}</div>}

      {/* Formulario rápido */}
      {showForm && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-bold text-sm" style={{ color: "#f1f5f9" }}>Nueva Entrada</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Nombre del visitante *</label>
              <input style={inputStyle} value={form.visitor_name} onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))} placeholder="Nombre completo" /></div>
            <div><label style={labelStyle}>Documento</label>
              <input style={inputStyle} value={form.visitor_document} onChange={e => setForm(f => ({ ...f, visitor_document: e.target.value }))} placeholder="CC / Pasaporte" /></div>
            <div><label style={labelStyle}>Visita a (Apto/Casa) *</label>
              <input style={inputStyle} value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Ej: 301, Casa 7" /></div>
            <div><label style={labelStyle}>Nombre del residente</label>
              <input style={inputStyle} value={form.resident_name} onChange={e => setForm(f => ({ ...f, resident_name: e.target.value }))} placeholder="Opcional" /></div>
            <div><label style={labelStyle}>Motivo</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSES.map(p => <option key={p} value={p} style={{ background: "#0d1424" }}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Notas</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" /></div>
          </div>
          <button onClick={handleRegister} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
            {saving ? <Spinner size={15} className="text-white" /> : <LogIn size={15} />}
            Confirmar entrada
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ v: "inside" as const, l: "Adentro", count: inside.length }, { v: "history" as const, l: "Historial", count: null }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={tab === t.v
              ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
              : { background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}>
            {t.v === "inside" ? <UserCheck size={14} /> : <History size={14} />}
            {t.l}
            {t.count !== null && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-black"
              style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Vista: Adentro */}
      {tab === "inside" && (
        loading ? <div className="flex justify-center p-10"><Spinner size={28} className="text-emerald-500" /></div> :
        inside.length === 0 ? (
          <div className="text-center py-14" style={{ color: "#475569" }}>
            <UserCheck size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nadie dentro del conjunto</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {inside.map(v => (
              <div key={v.id} className="p-4 rounded-2xl flex flex-col gap-3"
                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold" style={{ color: "#f1f5f9" }}>{v.visitor_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{v.visitor_document || "Sin doc."}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                    Adentro
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p style={{ color: "#475569" }}>Visita a</p><p className="font-bold mt-0.5" style={{ color: "#cbd5e1" }}>Apto {v.apartment}</p></div>
                  <div><p style={{ color: "#475569" }}>Motivo</p><p className="font-bold mt-0.5" style={{ color: "#cbd5e1" }}>{v.purpose}</p></div>
                  <div><p style={{ color: "#475569" }}>Hora entrada</p><p className="font-bold mt-0.5" style={{ color: "#cbd5e1" }}>{fmtTime(v.entry_time)}</p></div>
                  <div><p style={{ color: "#475569" }}>Tiempo dentro</p>
                    <p className="font-bold mt-0.5 flex items-center gap-1" style={{ color: "#fbbf24" }}>
                      <Clock size={11} />{elapsedTime(v.entry_time)}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleExit(v.id)} disabled={exitingId === v.id}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl font-bold text-xs disabled:opacity-50"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#f87171", border: "1px solid rgba(244,63,94,0.2)" }}>
                  {exitingId === v.id ? <Spinner size={13} className="text-rose-400" /> : <LogOut size={13} />}
                  Registrar salida
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Vista: Historial */}
      {tab === "history" && (
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={{ ...inputStyle, width: "auto" }} value={histDate}
              onChange={e => setHistDate(e.target.value)} />
          </div>
          {history.length === 0 ? (
            <div className="text-center py-10" style={{ color: "#475569" }}>
              <History size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sin registros para esta fecha</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm" style={{ minWidth: "500px" }}>
                <thead>
                  <tr style={{ background: "rgba(16,185,129,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {["Visitante", "Apto", "Motivo", "Entrada", "Salida", "Estado"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-bold" style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((v, i) => (
                    <tr key={v.id} style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#e2e8f0" }}>{v.visitor_name}</td>
                      <td className="px-4 py-3" style={{ color: "#94a3b8" }}>Apto {v.apartment}</td>
                      <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{v.purpose || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{fmtTime(v.entry_time)}</td>
                      <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{v.exit_time ? fmtTime(v.exit_time) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={v.status === "inside"
                            ? { background: "rgba(16,185,129,0.15)", color: "#34d399" }
                            : { background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          {v.status === "inside" ? "Adentro" : "Salió"}
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
