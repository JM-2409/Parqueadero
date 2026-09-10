"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { MessageCircle, Package, Car, Filter, Search, Calendar } from "lucide-react";

interface WaMessage {
  id: string;
  phone: string;
  message: string;
  type: "parking" | "package" | "moving_permit" | "general";
  sent_at: string;
  sent_by?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  parking:       { label: "Parqueadero", icon: Car,           color: "#818cf8" },
  package:       { label: "Paquete",     icon: Package,       color: "#22d3ee" },
  moving_permit: { label: "Trasteo",     icon: MessageCircle, color: "#fbbf24" },
  general:       { label: "General",     icon: MessageCircle, color: "#94a3b8" },
};

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Props { parkingLotId: string; }

export default function WhatsAppCenter({ parkingLotId }: Props) {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("whatsapp_log").select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("sent_at", { ascending: false }).limit(100);

    if (typeFilter !== "all") q = q.eq("type", typeFilter);
    if (dateFilter) {
      q = q.gte("sent_at", `${dateFilter}T00:00:00`).lte("sent_at", `${dateFilter}T23:59:59`);
    }

    const { data } = await q;
    setMessages(data || []);
    setLoading(false);
  }, [parkingLotId, typeFilter, dateFilter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const filtered = search
    ? messages.filter(m => m.phone.includes(search) || m.message.toLowerCase().includes(search.toLowerCase()))
    : messages;

  const totalByType = messages.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {} as Record<string, number>);

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", padding: "0.6rem 1rem", outline: "none", fontFamily: "inherit", fontSize: "0.875rem" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl" style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
          <MessageCircle size={22} style={{ color: "#4ade80" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Centro de Mensajes WhatsApp</h2>
          <p className="text-sm" style={{ color: "#64748b" }}>{messages.length} mensajes enviados</p>
        </div>
      </div>

      {/* Stats por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={type} className="p-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon size={20} className="mx-auto mb-1.5" style={{ color: cfg.color }} />
              <p className="text-xl font-black" style={{ color: "#f1f5f9" }}>{totalByType[type] || 0}</p>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: "#64748b" }}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número o mensaje..."
            style={{ ...inputStyle, paddingLeft: "2.25rem", width: "100%" }} />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ ...inputStyle }} />
        <div className="flex gap-2 flex-wrap">
          {[{ v: "all", l: "Todos" }, ...Object.entries(TYPE_CONFIG).map(([v, c]) => ({ v, l: c.label }))].map(opt => (
            <button key={opt.v} onClick={() => setTypeFilter(opt.v)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={typeFilter === opt.v
                ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                : { background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de mensajes */}
      {loading ? <div className="flex justify-center p-10"><Spinner size={28} className="text-emerald-500" /></div> :
        filtered.length === 0 ? (
          <div className="text-center py-14" style={{ color: "#475569" }}>
            <MessageCircle size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Sin mensajes registrados</p>
            <p className="text-xs mt-1">Los mensajes de WhatsApp de parqueadero y paquetes aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(msg => {
              const cfg = TYPE_CONFIG[msg.type] || TYPE_CONFIG.general;
              const Icon = cfg.icon;
              return (
                <div key={msg.id} className="flex items-start gap-3 p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="p-2 rounded-xl shrink-0" style={{ background: `rgba(${cfg.color === "#818cf8" ? "99,102,241" : cfg.color === "#22d3ee" ? "6,182,212" : cfg.color === "#fbbf24" ? "245,158,11" : "148,163,184"},0.12)` }}>
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <a href={`https://wa.me/${msg.phone}`} target="_blank" rel="noopener noreferrer"
                          className="font-bold text-sm transition-colors" style={{ color: "#4ade80" }}>
                          {msg.phone}
                        </a>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.05)", color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "#475569" }}>{fmtDateTime(msg.sent_at)}</span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2" style={{ color: "#94a3b8" }}>{msg.message}</p>
                    {msg.sent_by && <p className="text-xs mt-0.5" style={{ color: "#334155" }}>Por: {msg.sent_by}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
