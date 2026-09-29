"use client";

import React from "react";
import { Car, Bike, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";

interface OccupancyData {
  [key: string]: { occupied: number; capacity: number };
}

const CATEGORIES_CONFIG: Record<string, {
  title: string;
  icon: any;
  gradient: string;
  glow: string;
  badgeColor: string;
  badgeBorder: string;
  textColor: string;
}> = {
  carros: {
    title: "Carros",
    icon: Car,
    gradient: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    glow: "rgba(67,56,202,0.15)",
    badgeColor: "#e0e7ff",
    badgeBorder: "#c7d2fe",
    textColor: "#312e81",
  },
  motos: {
    title: "Motos",
    icon: Bike,
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    glow: "rgba(5,150,105,0.15)",
    badgeColor: "#d1fae5",
    badgeBorder: "#a7f3d0",
    textColor: "#065f46",
  },
  bicicletas: {
    title: "Bicicletas",
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    glow: "rgba(217,119,6,0.15)",
    badgeColor: "#fef3c7",
    badgeBorder: "#fde68a",
    textColor: "#92400e",
  },
};

export function OccupancyGauge({
  data,
  allowedVehicles = ["carros", "motos", "bicicletas"],
}: {
  data: OccupancyData;
  allowedVehicles?: string[];
}) {
  const activeCategories = allowedVehicles
    .map((v) => v.toLowerCase())
    .filter((v) => CATEGORIES_CONFIG[v]);

  const displayCategories = activeCategories.length > 0
    ? activeCategories
    : Object.keys(CATEGORIES_CONFIG);

  let totalOccupied = 0;
  let totalCapacity = 0;

  displayCategories.forEach((catKey) => {
    const catData = data[catKey];
    if (catData) {
      totalOccupied += catData.occupied || 0;
      totalCapacity += catData.capacity || 0;
    }
  });

  const totalPct = Math.min(
    100,
    Math.round((totalOccupied / (totalCapacity || 1)) * 100)
  );

  return (
    <div>
      {/* ── Tarjetas por tipo de vehículo (Filtradas según allowedVehicles) ── */}
      <div className={`grid grid-cols-1 ${displayCategories.length === 1 ? "sm:grid-cols-1" : displayCategories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
        {displayCategories.map((catKey) => {
          const cat = CATEGORIES_CONFIG[catKey];
          const Icon = cat.icon;
          const catData = data[catKey] || { occupied: 0, capacity: 1 };
          const occupied = catData.occupied || 0;
          const capacity = catData.capacity || 1;
          const available = Math.max(0, capacity - occupied);
          const pct = Math.min(100, Math.round((occupied / capacity) * 100));
          const isFull = occupied >= capacity;
          const isHigh = pct >= 80 && !isFull;

          return (
            <div
              key={catKey}
              className={`relative rounded-2xl p-4 overflow-hidden transition-all duration-300 bg-white border ${isFull ? "border-rose-300 shadow-rose-100" : isHigh ? "border-amber-300 shadow-amber-100" : "border-slate-200 shadow-sm"}`}
            >
              <div className="relative">
                {/* Encabezado */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2 rounded-xl"
                      style={{
                        background: cat.badgeColor,
                        border: `1px solid ${cat.badgeBorder}`,
                      }}
                    >
                      <Icon size={16} style={{ color: cat.textColor }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{cat.title}</p>
                      <p className="text-xs text-slate-500">{available} libre{available !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <span className="font-black text-xl" style={{ color: cat.textColor }}>{pct}%</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full h-2 rounded-full mb-3 overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${pct}%`,
                      background: isFull
                        ? "linear-gradient(135deg, #e11d48, #ea580c)"
                        : isHigh
                        ? "linear-gradient(135deg, #d97706, #f59e0b)"
                        : cat.gradient,
                    }}
                  />
                </div>

                {/* Estadísticas */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {occupied} ocupados
                  </span>
                  {isFull ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-600">
                      <AlertTriangle size={11} />
                      ¡LLENO!
                    </span>
                  ) : isHigh ? (
                    <span className="text-xs font-bold text-amber-600">
                      Casi lleno
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700">
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
