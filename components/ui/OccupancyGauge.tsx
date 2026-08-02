"use client";

import React from "react";
import { Car, Bike, ShieldCheck, AlertTriangle } from "lucide-react";

interface OccupancyData {
  carros: { occupied: number; capacity: number };
  motos: { occupied: number; capacity: number };
  bicicletas: { occupied: number; capacity: number };
}

export function OccupancyGauge({ data }: { data: OccupancyData }) {
  const categories = [
    {
      key: "carros",
      title: "Carros",
      icon: Car,
      color: "from-blue-600 to-indigo-600",
      bgColor: "bg-blue-50 text-blue-700 border-blue-100",
      barColor: "bg-gradient-to-r from-blue-500 to-indigo-600",
      occupied: data.carros.occupied,
      capacity: data.carros.capacity || 50,
    },
    {
      key: "motos",
      title: "Motos",
      icon: Bike,
      color: "from-emerald-600 to-teal-600",
      bgColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      barColor: "bg-gradient-to-r from-emerald-500 to-teal-600",
      occupied: data.motos.occupied,
      capacity: data.motos.capacity || 50,
    },
    {
      key: "bicicletas",
      title: "Bicicletas",
      icon: ShieldCheck,
      color: "from-amber-600 to-orange-600",
      bgColor: "bg-amber-50 text-amber-700 border-amber-100",
      barColor: "bg-gradient-to-r from-amber-500 to-orange-600",
      occupied: data.bicicletas.occupied,
      capacity: data.bicicletas.capacity || 20,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const available = Math.max(0, cat.capacity - cat.occupied);
        const percentage = Math.min(
          100,
          Math.round((cat.occupied / (cat.capacity || 1)) * 100)
        );
        const isFull = cat.occupied >= cat.capacity;

        return (
          <div
            key={cat.key}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${cat.bgColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {available} cupos libres de {cat.capacity}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-900">
                  {percentage}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2 relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFull ? "bg-red-500" : cat.barColor
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-600">Ocupados: {cat.occupied}</span>
              {isFull ? (
                <span className="text-red-600 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> ¡SIN CUPOS!
                </span>
              ) : (
                <span className="text-emerald-600 font-bold">
                  {available} disponibles
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
