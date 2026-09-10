"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/error";
import { Truck, Plus, X, Check, Filter, CheckCircle2, XCircle, Clock } from "lucide-react";

interface MovingPermit {
  id: string;
  apartment: string;
  resident_name?: string;
  moving_company?: string;
  truck_plate?: string;
  permit_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "completed";
  authorized_by?: string;
  notes?: string;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: "Pendiente",  bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  approved:  { label: "Aprobado",   bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
  rejected:  { label: "Rechazado",  bg: "rgba(244,63,94,0.12)",  color: "#f87171", border: "rgba(244,63,94,0.3)" },
  completed: { label: "Completado", bg: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "rgba(99,102,241,0.3)" },
};

const EMPTY = { apartment: "", resident_name: "", moving_company: "", truck_plate: "", permit_date: new Date().toISOString().split("T")[0], start_time: "08:00", end_time: "17:00", notes: "" };

interface Props { parkingLotId: string; employeeName: string; isAdmin?: boolean; }

export default function MovingPermits({ parkingLotId, employeeName, isAdmin = true }: Props) {
  const [permits, setPermits] = useState<MovingPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const fetchPermits = useCallback(async () => {
    const { data } = await supabase.from("moving_permits").select("*")
      .eq("parking_lot_id", parkingLotId).order("permit_date", { ascending: false });
    setPermits(data || []);
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => { fetchPermits(); }, [fetchPermits]);

  const handleCreate = async () => {
    if (!form.apartment.trim()) { setError("El apartamento es obligatorio"); return; }
    setSaving(true); setError("");
    const { error: e } = await supabase.from("moving_permits").insert([{ ...form, parking_lot_id: parkingLotId, status: "pending" }]);
    if (e) { setError(getErrorMessage(e)); } else { setForm(EMPTY); setShowForm(false); setSuccess("Permiso solicitado"); fetchPermits(); setTimeout(() => setSuccess(""), 3000); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: MovingPermit["status"]) => {
    setActionId(id);
    const { error: e } = await supabase.from("moving_permits").update({ status, authorized_by: employeeName, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) setError(getErrorMessage(e)); else fetchPermits();
    setActionId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este permiso?")) return;
    await supabase.from("moving_permits").delete().eq("id", id);
    fetchPermits();
  };

  const filtered = filter === "all" ? permits : permits.filter(p => p.status === filter);

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.65rem 1rem", width: "100%", outline: "none", fontFamily: "inherit", fontSize: "0.875rem" };
  const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.3rem" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Truck size={22} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Permisos de Trasteo</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>{permits.filter(p => p.status === "pending").length} pendiente(s) de aprobación</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {error && <div className="alert-error text-sm">{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
        <Check size={15} /> {success}</div>}

      {/* Formulario */}
      {showForm && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-bold text-sm" style={{ color: "#f1f5f9" }}>Nueva Solicitud de Trasteo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Apartamento / Casa *</label>
              <input style={inputStyle} value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Ej: 201, Casa 3" /></div>
            <div><label style={labelStyle}>Nombre del residente</label>
              <input style={inputStyle} value={form.resident_name} onChange={e => setForm(f => ({ ...f, resident_name: e.target.value }))} /></div>
            <div><label style={labelStyle}>Empresa de trasteo</label>
              <input style={inputStyle} value={form.moving_company} onChange={e => setForm(f => ({ ...f, moving_company: e.target.value }))} placeholder="Ej: Trasteos Bogotá" /></div>
            <div><label style={labelStyle}>Placa del camión</label>
              <input style={inputStyle} value={form.truck_plate} onChange={e => setForm(f => ({ ...f, truck_plate: e.target.value.toUpperCase() }))} placeholder="ABC123" /></div>
            <div><label style={labelStyle}>Fecha</label>
              <input type="date" style={inputStyle} value={form.permit_date} onChange={e => setForm(f => ({ ...f, permit_date: e.target.value }))} /></div>
            <div className="flex gap-3">
              <div className="flex-1"><label style={labelStyle}>Hora inicio</label>
                <input type="time" style={inputStyle} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div className="flex-1"><label style={labelStyle}>Hora fin</label>
                <input type="time" style={inputStyle} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
          </div>
          <div><label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, resize: "none" }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff" }}>
            {saving ? <Spinner size={15} className="text-white" /> : <Check size={15} />} Solicitar permiso
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[{ v: "all", l: "Todos" }, { v: "pending", l: "Pendientes" }, { v: "approved", l: "Aprobados" }, { v: "rejected", l: "Rechazados" }, { v: "completed", l: "Completados" }].map(opt => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={filter === opt.v
              ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }
              : { background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}>
            {opt.l}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? <div className="flex justify-center p-10"><Spinner size={28} className="text-amber-500" /></div> :
        filtered.length === 0 ? (
          <div className="text-center py-14" style={{ color: "#475569" }}>
            <Truck size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Sin permisos en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const st = STATUS_STYLES[p.status];
              return (
                <div key={p.id} className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold" style={{ color: "#f1f5f9" }}>Apto {p.apartment}</p>
                        {p.resident_name && <span style={{ color: "#64748b", fontSize: "0.875rem" }}>— {p.resident_name}</span>}
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: "#94a3b8" }}>
                        {p.moving_company && <span className="flex items-center gap-1"><Truck size={12} />{p.moving_company}</span>}
                        {p.truck_plate && <span className="font-mono font-bold" style={{ color: "#818cf8" }}>{p.truck_plate}</span>}
                        <span className="flex items-center gap-1"><Clock size={12} />
                          {new Date(p.permit_date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · {p.start_time}–{p.end_time}
                        </span>
                      </div>
                      {p.notes && <p className="text-xs" style={{ color: "#475569" }}>{p.notes}</p>}
                      {p.authorized_by && <p className="text-xs" style={{ color: "#475569" }}>Autorizado por: {p.authorized_by}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 flex-wrap shrink-0">
                        {p.status === "pending" && (<>
                          <button onClick={() => updateStatus(p.id, "approved")} disabled={actionId === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                            {actionId === p.id ? <Spinner size={12} /> : <CheckCircle2 size={13} />} Aprobar
                          </button>
                          <button onClick={() => updateStatus(p.id, "rejected")} disabled={actionId === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(244,63,94,0.1)", color: "#f87171", border: "1px solid rgba(244,63,94,0.25)" }}>
                            <XCircle size={13} /> Rechazar
                          </button>
                        </>)}
                        {p.status === "approved" && (
                          <button onClick={() => updateStatus(p.id, "completed")} disabled={actionId === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                            <Check size={13} /> Completar
                          </button>
                        )}
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg" style={{ background: "rgba(244,63,94,0.08)", color: "#f87171" }}>
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
