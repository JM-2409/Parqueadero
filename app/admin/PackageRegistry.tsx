"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/error";
import { Package, Plus, X, Check, MessageCircle, Clock, History, CheckCircle2 } from "lucide-react";

interface PkgRecord {
  id: string;
  apartment: string;
  recipient_name?: string;
  company?: string;
  description?: string;
  arrival_time: string;
  delivered_time?: string;
  delivered_to?: string;
  status: "pending" | "delivered" | "returned";
  whatsapp_sent: boolean;
  registered_by?: string;
  notes?: string;
}

const COMPANIES = ["Rappi", "iFood", "Domicilios.com", "Amazon", "Mercado Libre", "DHL", "FedEx", "Interrapídisimo", "Coordinadora", "TCC", "Servientrega", "Otro"];
const COMPANY_ICONS: Record<string, string> = { Rappi: "🛵", iFood: "🛵", "Domicilios.com": "🛵", Amazon: "📦", "Mercado Libre": "🟡", DHL: "🟡", FedEx: "🟣", Interrapídisimo: "🔴", Coordinadora: "🔵", TCC: "🔵", Servientrega: "🟢", Otro: "📦" };

function elapsed(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); const rm = m % 60;
  return `${h}h ${rm}m`;
}
function fmtTime(ts: string) { return new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(ts: string) { return new Date(ts).toLocaleDateString("es-CO", { day: "numeric", month: "short" }); }

interface Props { parkingLotId: string; employeeName: string; whatsappEnabled?: boolean; }

export default function PackageRegistry({ parkingLotId, employeeName, whatsappEnabled = false }: Props) {
  const [pending, setPending] = useState<PkgRecord[]>([]);
  const [historyPkgs, setHistoryPkgs] = useState<PkgRecord[]>([]);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ apartment: "", recipient_name: "", company: "Otro", description: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deliverModal, setDeliverModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [deliveredTo, setDeliveredTo] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // WhatsApp link generado al crear paquete
  const [waLink, setWaLink] = useState<{ url: string; name: string } | null>(null);

  const fetchPending = useCallback(async () => {
    const { data } = await supabase.from("packages").select("*")
      .eq("parking_lot_id", parkingLotId).eq("status", "pending")
      .order("arrival_time", { ascending: false });
    setPending(data || []);
    setLoading(false);
  }, [parkingLotId]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase.from("packages").select("*")
      .eq("parking_lot_id", parkingLotId).neq("status", "pending")
      .order("arrival_time", { ascending: false }).limit(50);
    setHistoryPkgs(data || []);
  }, [parkingLotId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { if (tab === "history") fetchHistory(); }, [tab, fetchHistory]);

  const lookupResident = async (apt: string) => {
    if (!apt.trim()) return null;
    const { data } = await supabase.from("residents").select("owner_name, phone")
      .eq("parking_lot_id", parkingLotId).eq("apartment", apt.trim()).maybeSingle();
    return data;
  };

  const buildWaUrl = (phone: string, name: string, apt: string, company: string) => {
    const msg = encodeURIComponent(`¡Hola ${name}! 📦 Llegó un paquete a la portería para el apartamento ${apt}. Empresa: ${company}. Puede pasar a recogerlo. — Administración`);
    return `https://wa.me/57${phone.replace(/\D/g, "")}?text=${msg}`;
  };

  const handleCreate = async () => {
    if (!form.apartment.trim()) { setError("El apartamento es obligatorio"); return; }
    setSaving(true); setError(""); setWaLink(null);
    try {
      // Buscar residente para autocompletar nombre y teléfono
      const resident = await lookupResident(form.apartment);
      const recipientName = form.recipient_name || resident?.owner_name || "";
      const phone = resident?.phone;

      const { data: inserted, error: e } = await supabase.from("packages").insert([{
        ...form, recipient_name: recipientName, parking_lot_id: parkingLotId,
        status: "pending", arrival_time: new Date().toISOString(),
        registered_by: employeeName, whatsapp_sent: false,
      }]).select().single();
      if (e) throw e;

      // Generar enlace WhatsApp si hay teléfono
      if (phone && whatsappEnabled) {
        const url = buildWaUrl(phone, recipientName, form.apartment, form.company);
        setWaLink({ url, name: recipientName });
        // Registrar en log y marcar como enviado
        await supabase.from("packages").update({ whatsapp_sent: true }).eq("id", inserted.id);
        await supabase.from("whatsapp_log").insert([{
          parking_lot_id: parkingLotId, phone, type: "package", reference_id: inserted.id,
          message: `Paquete llegó para ${recipientName} Apto ${form.apartment}. Empresa: ${form.company}`,
          sent_by: employeeName, sent_at: new Date().toISOString(),
        }]);
      }

      setForm({ apartment: "", recipient_name: "", company: "Otro", description: "", notes: "" });
      setShowForm(false); fetchPending();
      setSuccess(phone && whatsappEnabled ? "Paquete registrado — enlace WhatsApp generado" : "Paquete registrado");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDeliver = async () => {
    setActionId(deliverModal.id);
    const { error: e } = await supabase.from("packages").update({
      status: "delivered", delivered_time: new Date().toISOString(), delivered_to: deliveredTo,
    }).eq("id", deliverModal.id);
    if (e) setError(getErrorMessage(e)); else { fetchPending(); if (tab === "history") fetchHistory(); }
    setDeliverModal({ open: false, id: "" }); setDeliveredTo(""); setActionId(null);
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.65rem 1rem", width: "100%", outline: "none", fontFamily: "inherit", fontSize: "0.875rem" };
  const labelStyle = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.3rem" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}>
            <Package size={22} style={{ color: "#22d3ee" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Registro de Paquetes</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>{pending.length} paquete{pending.length !== 1 ? "s" : ""} esperando entrega</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(v => !v); setWaLink(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#fff", boxShadow: "0 4px 15px rgba(6,182,212,0.3)" }}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Cancelar" : "Registrar paquete"}
        </button>
      </div>

      {error && <div className="alert-error text-sm">{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
        <Check size={15} /> {success}</div>}

      {/* Enlace WhatsApp generado */}
      {waLink && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl"
          style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#4ade80" }}>
            <MessageCircle size={18} />
            <span>¡Mensaje listo para <strong>{waLink.name}</strong>!</span>
          </div>
          <a href={waLink.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm shrink-0"
            style={{ background: "#25d366", color: "#fff" }}
            onClick={() => setWaLink(null)}>
            <MessageCircle size={14} /> Abrir WhatsApp
          </a>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-bold text-sm" style={{ color: "#f1f5f9" }}>Nuevo Paquete / Domicilio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Apartamento / Casa *</label>
              <input style={inputStyle} value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Ej: 402, Casa 8" /></div>
            <div><label style={labelStyle}>Nombre destinatario</label>
              <input style={inputStyle} value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Se autocompleta con el directorio" /></div>
            <div><label style={labelStyle}>Empresa</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                {COMPANIES.map(c => <option key={c} value={c} style={{ background: "#0d1424" }}>{COMPANY_ICONS[c]} {c}</option>)}
              </select></div>
            <div><label style={labelStyle}>Descripción</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Caja mediana" /></div>
          </div>
          <div><label style={labelStyle}>Notas</label>
            <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          {whatsappEnabled && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "#4ade80" }}>
              <MessageCircle size={12} /> Si el residente tiene celular en el directorio, se generará el mensaje de WhatsApp automáticamente.
            </p>
          )}
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#fff" }}>
            {saving ? <Spinner size={15} className="text-white" /> : <Check size={15} />} Registrar paquete
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ v: "pending" as const, l: "Pendientes", cnt: pending.length }, { v: "history" as const, l: "Historial", cnt: null }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={tab === t.v
              ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
              : { background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}>
            {t.v === "pending" ? <Package size={14} /> : <History size={14} />}
            {t.l}
            {t.cnt !== null && <span className="px-1.5 py-0.5 rounded-full text-xs font-black" style={{ background: "rgba(6,182,212,0.2)", color: "#22d3ee" }}>{t.cnt}</span>}
          </button>
        ))}
      </div>

      {/* Modal entregar */}
      {deliverModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
          <div className="w-full max-w-sm p-6 rounded-2xl space-y-4" style={{ background: "#0d1424", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="font-bold" style={{ color: "#f1f5f9" }}>¿Quién recibió el paquete?</h3>
            <input style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.65rem 1rem", width: "100%", outline: "none" }}
              value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)} placeholder="Nombre de quien recibió" autoFocus />
            <div className="flex gap-3">
              <button onClick={handleDeliver} disabled={!!actionId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
                {actionId ? <Spinner size={14} /> : <CheckCircle2 size={14} />} Confirmar
              </button>
              <button onClick={() => setDeliverModal({ open: false, id: "" })}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista pendientes */}
      {tab === "pending" && (
        loading ? <div className="flex justify-center p-10"><Spinner size={28} className="text-cyan-500" /></div> :
        pending.length === 0 ? (
          <div className="text-center py-14" style={{ color: "#475569" }}>
            <Package size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Sin paquetes pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(pkg => (
              <div key={pkg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl shrink-0">{COMPANY_ICONS[pkg.company || "Otro"] || "📦"}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold" style={{ color: "#f1f5f9" }}>Apto {pkg.apartment}</p>
                      {pkg.recipient_name && <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>{pkg.recipient_name}</span>}
                    </div>
                    <div className="text-xs flex items-center gap-3 mt-0.5 flex-wrap" style={{ color: "#64748b" }}>
                      <span>{pkg.company}</span>
                      {pkg.description && <span>{pkg.description}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} />{elapsed(pkg.arrival_time)} esperando</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {pkg.whatsapp_sent && (
                    <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full font-semibold"
                      style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <MessageCircle size={11} /> Notificado
                    </span>
                  )}
                  <button onClick={() => setDeliverModal({ open: true, id: pkg.id })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
                    <CheckCircle2 size={13} /> Entregado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Historial */}
      {tab === "history" && (
        historyPkgs.length === 0 ? (
          <div className="text-center py-14" style={{ color: "#475569" }}>
            <History size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Sin historial</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-sm" style={{ minWidth: "500px" }}>
              <thead>
                <tr style={{ background: "rgba(6,182,212,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Apto", "Destinatario", "Empresa", "Llegó", "Entregado a", "Estado"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-bold" style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyPkgs.map((pkg, i) => (
                  <tr key={pkg.id} style={{ borderBottom: i < historyPkgs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td className="px-4 py-3 font-bold" style={{ color: "#f1f5f9" }}>Apto {pkg.apartment}</td>
                    <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{pkg.recipient_name || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{COMPANY_ICONS[pkg.company || ""] || "📦"} {pkg.company}</td>
                    <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{fmtDate(pkg.arrival_time)} {fmtTime(pkg.arrival_time)}</td>
                    <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{pkg.delivered_to || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={pkg.status === "delivered"
                          ? { background: "rgba(16,185,129,0.12)", color: "#34d399" }
                          : { background: "rgba(244,63,94,0.1)", color: "#f87171" }}>
                        {pkg.status === "delivered" ? "Entregado" : "Devuelto"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
