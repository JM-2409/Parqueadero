"use client";

import { useState } from "react";
import VehicleInspections from "./VehicleInspections";
import VehicleInspectionsHistory from "./VehicleInspectionsHistory";

export default function InspectionsTab({
  parkingLot,
  profile,
}: {
  parkingLot: any;
  profile: any;
}) {
  const [view, setView] = useState<"new" | "history">("new");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-3xl w-fit">
        <button
          onClick={() => setView("new")}
          className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${
            view === "new"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          Hacer Revista
        </button>
        <button
          onClick={() => setView("history")}
          className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${
            view === "history"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          Última Revista
        </button>
      </div>

      {view === "new" ? (
        <VehicleInspections parkingLot={parkingLot} profile={profile} />
      ) : (
        <VehicleInspectionsHistory parkingLotId={parkingLot.id} limitToLatestSession={true} isAdmin={false} />
      )}
    </div>
  );
}
