"use client";

import React from "react";
import { Car, Bike, ShieldCheck, AlertTriangle } from "lucide-react";

interface OccupancyData {
  [key: string]: { occupied: number; capacity: number };
}

const CATEGORIES_CONFIG: Record<
  string,
  {
    title: string;
    icon: any;
    bar: string;
    textColor: string;
  }
> = {
  carros: {
    title: "Carros",
    icon: Car,
    bar: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    textColor: "#312e81",
  },
  motos: {
    title: "Motos",
    icon: Bike,
    bar: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    textColor: "#065f46",
  },
  bicicletas: {
    title: "Bicicletas",
    icon: ShieldCheck,
    bar: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
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

  const displayCategories =
    activeCategories.length > 0 ? activeCategories : Object.keys(CATEGORIES_CONFIG);

  return (
    <div
      className={`grid grid-cols-1 ${
        displayCategories.length === 1
          ? "sm:grid-cols-1"
          : displayCategories.length === 2
            ? "sm:grid-cols-2"
            : "sm:grid-cols-3"
      } gap-2`}
    >
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
            className={`rounded-2xl px-3.5 py-2.5 bg-white border ${
              isFull
                ? "border-rose-300"
                : isHigh
                  ? "border-amber-300"
                  : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={16} style={{ color: cat.textColor }} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-slate-800 truncate">{cat.title}</p>
                  <p className="text-xs font-black text-slate-900 tabular-nums">
                    {occupied}/{capacity}
                  </p>
                </div>
                <div className="w-full h-1.5 rounded-full mt-1.5 overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: isFull
                        ? "linear-gradient(135deg, #e11d48, #ea580c)"
                        : isHigh
                          ? "linear-gradient(135deg, #d97706, #f59e0b)"
                          : cat.bar,
                    }}
                  />
                </div>
              </div>
              {isFull ? (
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-600 shrink-0">
                  <AlertTriangle size={11} />
                  Lleno
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                  {available} lib.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
