"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/error";
import {
  Users, Plus, Edit2, Trash2, Search, Phone, MessageCircle,
  Car, Home, X, Check, ChevronDown, Shield
} from "lucide-react";

interface Resident {
  id: string;
  apartment: string;
  block?: string;
  owner_name: string;
  document?: string;
  phone?: string;
  email?: string;
  is_owner: boolean;
  vehicle_plates?: string[];
  notes?: string;
}

const EMPTY_FORM: Omit<Resident, "id"> = {
  apartment: "", block: "", owner_name: "", document: "",
  phone: "", email: "", is_owner: true, vehicle_plates: [], notes: "",
};

interface Props { parkingLotId: string; }

export default function ResidentsDirectory({ parkingLotId }: Props) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [form, setForm] = useState<Omit<Resident, "id">>(EMPTY_FORM);
  const [newPlate, setNewPlate] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from("residents").select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("apartment");
    if (!e) setResidents(data || []);
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (r: Resident) => {
    setEditing(r);
    setForm({ apartment: r.apartment, block: r.block || "", owner_name: r.owner_name,
      document: r.document || "", phone: r.phone || "", email: r.email || "",
      is_owner: r.is_owner, vehicle_plates: r.vehicle_plates || [], notes: r.notes || "" });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.apartment || !form.owner_name) { setError("Apartamento y nombre son obligatorios"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = { ...form, parking_lot_id: parkingLotId, updated_at: new Date().toISOString() };
      if (editing) {
        const { error: e } = await supabase.from("residents").update(payload).eq("id", editing.id);
        if (e) throw e;
        setSuccess("Residente actualizado");
      } else {
        const { error: e } = await supabase.from("residents").insert([payload]);
        if (e) throw e;
        setSuccess("Residente agregado");
      }
      closeForm(); fetch();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar a "${name}"?`)) return;
    const { error: e } = await supabase.from("residents").delete().eq("id", id);
    if (e) setError(getErrorMessage(e)); else fetch();
  };

  const addPlate = () => {
    if (!newPlate.trim()) return;
    setForm(f => ({ ...f, vehicle_plates: [...(f.vehicle_plates || []), newPlate.toUpperCase().trim()] }));
    setNewPlate("");
  };
  const removePlate = (i: number) => setForm(f => ({ ...f, vehicle_plates: f.vehicle_plates?.filter((_, idx) => idx !== i) }));

  const filtered = residents.filter(r =>
    r.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    r.apartment.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px" };
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.75rem 1rem", width: "100%", outline: "none", fontFamily: "inherit", fontSize: "0.9rem" };
  const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.375rem" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <Users size={22} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Directorio de Residentes</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>{residents.length} residente{residents.length !== 1 ? "s" : ""} registrado{residents.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              style={{ ...inputStyle, paddingLeft: "2.25rem", width: "100%", minWidth: "180px" }} />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && <div className="alert-error text-sm">{error}</div>}
      {success && <div className="p-3 rounded-xl text-sm font-semibold flex items-center gap-2"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
        <Check size={15} /> {success}</div>}

      {/* Aviso privacidad */}
      <div className="flex items-start gap-3 p-4 rounded-xl text-xs" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#fde68a" }}>
        <Shield size={14} className="shrink-0 mt-0.5" />
        <span>Esta información es <strong>confidencial</strong>. Solo el administrador del conjunto tiene acceso a estos datos.</span>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-base" style={{ color: "#f1f5f9" }}>{editing ? "Editar Residente" : "Nuevo Residente"}</h3>
            <button onClick={closeForm} style={{ color: "#475569" }}><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Apartamento / Casa *</label>
              <input style={inputStyle} value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Ej: 101, Casa 5" /></div>
            <div><label style={labelStyle}>Bloque / Torre</label>
              <input style={inputStyle} value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} placeholder="Ej: B, Torre 2" /></div>
            <div><label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Nombre del residente" /></div>
            <div><label style={labelStyle}>Documento</label>
              <input style={inputStyle} value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="CC / NIT" /></div>
            <div><label style={labelStyle}>Celular</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="3001234567" /></div>
            <div><label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@email.com" /></div>
          </div>
          {/* Tipo */}
          <div className="flex gap-3">
            {[{ v: true, l: "Propietario" }, { v: false, l: "Arrendatario" }].map(opt => (
              <button key={String(opt.v)} onClick={() => setForm(f => ({ ...f, is_owner: opt.v }))}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={form.is_owner === opt.v
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                {opt.l}
              </button>
            ))}
          </div>
          {/* Placas */}
          <div>
            <label style={labelStyle}>Placas de vehículos</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {(form.vehicle_plates || []).map((p, i) => (
                <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <Car size={12} /> {p}
                  <button onClick={() => removePlate(i)} className="ml-1"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input style={{ ...inputStyle, flex: 1 }} value={newPlate} onChange={e => setNewPlate(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPlate()} placeholder="Ej: ABC123" />
              <button onClick={addPlate} className="px-3 py-2 rounded-xl font-bold text-sm"
                style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          {/* Notas */}
          <div><label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, resize: "none" }} rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones..." /></div>
          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
              {saving ? <Spinner size={16} className="text-white" /> : <Check size={16} />}
              {editing ? "Guardar cambios" : "Agregar residente"}
            </button>
            <button onClick={closeForm} className="px-5 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla / Lista */}
      {loading ? <div className="flex justify-center p-12"><Spinner size={32} className="text-indigo-500" /></div> :
        filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#475569" }}>
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{search ? "Sin resultados" : "Sin residentes registrados"}</p>
            <p className="text-sm mt-1">{search ? "Intenta otra búsqueda" : "Agrega el primero con el botón de arriba"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-sm" style={{ minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Apto/Casa", "Residente", "Celular", "Tipo", "Vehículos", "Acciones"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-bold" style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Home size={14} style={{ color: "#6366f1" }} />
                        <span className="font-bold" style={{ color: "#f1f5f9" }}>{r.apartment}</span>
                        {r.block && <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}>{r.block}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "#e2e8f0" }}>{r.owner_name}</p>
                      {r.email && <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{r.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {r.phone ? (
                        <a href={`https://wa.me/57${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 transition-colors"
                          style={{ color: "#4ade80" }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#86efac")}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#4ade80")}>
                          <MessageCircle size={14} /> {r.phone}
                        </a>
                      ) : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={r.is_owner
                          ? { background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }
                          : { background: "rgba(245,158,11,0.1)", color: "#fde68a", border: "1px solid rgba(245,158,11,0.25)" }}>
                        {r.is_owner ? "Propietario" : "Arrendatario"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(r.vehicle_plates || []).length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {(r.vehicle_plates || []).slice(0, 2).map((p, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>{p}</span>
                          ))}
                          {(r.vehicle_plates || []).length > 2 && <span className="text-xs" style={{ color: "#475569" }}>+{(r.vehicle_plates || []).length - 2}</span>}
                        </div>
                      ) : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg transition-all"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                          title="Editar"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(r.id, r.owner_name)} className="p-2 rounded-lg transition-all"
                          style={{ background: "rgba(244,63,94,0.1)", color: "#f87171" }}
                          title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
