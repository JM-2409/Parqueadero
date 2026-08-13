"use client";

import React from "react";
import { Car, Bike, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";

interface OccupancyData {
  carros: { occupied: number; capacity: number };
  motos: { occupied: number; capacity: number };
  bicicletas: { occupied: number; capacity: number };
}

const CATEGORIES = [
  {
    key: "carros" as const,
    title: "Carros",
    icon: Car,
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    glow: "rgba(99,102,241,0.35)",
    badgeColor: "rgba(99,102,241,0.12)",
    badgeBorder: "rgba(99,102,241,0.3)",
    textColor: "#a5b4fc",
  },
  {
    key: "motos" as const,
    title: "Motos",
    icon: Bike,
    gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    glow: "rgba(16,185,129,0.35)",
    badgeColor: "rgba(16,185,129,0.12)",
    badgeBorder: "rgba(16,185,129,0.3)",
    textColor: "#6ee7b7",
  },
  {
    key: "bicicletas" as const,
    title: "Bicicletas",
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
    glow: "rgba(245,158,11,0.35)",
    badgeColor: "rgba(245,158,11,0.12)",
    badgeBorder: "rgba(245,158,11,0.3)",
    textColor: "#fde68a",
  },
];

export function OccupancyGauge({ data }: { data: OccupancyData }) {
  const totalOccupied = data.carros.occupied + data.motos.occupied + data.bicicletas.occupied;
  const totalCapacity = (data.carros.capacity || 50) + (data.motos.capacity || 35) + (data.bicicletas.capacity || 15);
  const totalPct = Math.min(100, Math.round((totalOccupied / (totalCapacity || 1)) * 100));

  return (
    <div className="space-y-4">
      {/* ── Banner de ocupación global ── */}
      <div
        className="relative rounded-2xl p-5 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Gradiente decorativo de fondo */}
        <div className="absolute inset-0 opacity-20"
          style={{
            background: totalPct >= 90
              ? "radial-gradient(ellipse at top left, rgba(244,63,94,0.3), transparent 60%)"
              : "radial-gradient(ellipse at top left, rgba(99,102,241,0.2), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} style={{ color: "#6366f1" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>
                Ocupación Total en Tiempo Real
              </span>
            </div>
            <p className="text-3xl font-black" style={{ color: "#f1f5f9" }}>
              {totalOccupied}{" "}
              <span className="text-base font-semibold" style={{ color: "#64748b" }}>
                / {totalCapacity} vehículos
              </span>
            </p>
          </div>
          <div className="flex items-center justify-end sm:justify-start">
            <div
              className="relative w-20 h-20"
              style={{ flexShrink: 0 }}
            >
              {/* Círculo de progreso con SVG */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <circle cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke={totalPct >= 90 ? "#f43f5e" : totalPct >= 70 ? "#f59e0b" : "#6366f1"}
                  strokeWidth="3"
                  strokeDasharray={`${totalPct} ${100 - totalPct}`}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 4px ${totalPct >= 90 ? "rgba(244,63,94,0.6)" : "rgba(99,102,241,0.6)"})`,
                    transition: "stroke-dasharray 0.8s ease",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-sm" style={{ color: "#f1f5f9" }}>{totalPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tarjetas por tipo de vehículo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const occupied = data[cat.key].occupied;
          const capacity = data[cat.key].capacity || 1;
          const available = Math.max(0, capacity - occupied);
          const pct = Math.min(100, Math.round((occupied / capacity) * 100));
          const isFull = occupied >= capacity;
          const isHigh = pct >= 80 && !isFull;

          return (
            <div
              key={cat.key}
              className="relative rounded-2xl p-4 overflow-hidden transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${isFull ? "rgba(244,63,94,0.35)" : isHigh ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              {/* Fondo decorativo suave */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top right, ${cat.glow}, transparent 70%)` }}
              />

              <div className="relative">
                {/* Encabezado */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl"
                      style={{
                        background: cat.badgeColor,
                        border: `1px solid ${cat.badgeBorder}`,
                      }}
                    >
                      <Icon size={16} style={{ color: cat.textColor }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#f1f5f9" }}>{cat.title}</p>
                      <p className="text-xs" style={{ color: "#475569" }}>{available} libre{available !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <span className="font-black text-xl" style={{ color: cat.textColor }}>{pct}%</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full h-2 rounded-full mb-3 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${pct}%`,
                      background: isFull
                        ? "linear-gradient(135deg, #f43f5e, #f97316)"
                        : isHigh
                        ? "linear-gradient(135deg, #f59e0b, #f97316)"
                        : cat.gradient,
                      boxShadow: `0 0 8px ${isFull ? "rgba(244,63,94,0.5)" : cat.glow}`,
                    }}
                  >
                    {/* Shimmer */}
                    <div className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                        animation: "shimmer 2s infinite",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "#64748b" }}>
                    {occupied} ocupados
                  </span>
                  {isFull ? (
                    <span className="flex items-center gap-1 text-xs font-bold"
                      style={{ color: "#f87171" }}>
                      <AlertTriangle size={11} />
                      ¡LLENO!
                    </span>
                  ) : isHigh ? (
                    <span className="text-xs font-bold" style={{ color: "#fbbf24" }}>
                      Casi lleno
                    </span>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: "#34d399" }}>
                      {available} disponible{available !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
