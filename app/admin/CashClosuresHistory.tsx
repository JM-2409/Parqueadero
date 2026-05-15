"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Calendar, DollarSign, X } from "lucide-react";
import styles from "./admin.module.css";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function CashClosuresHistory({
  parkingLotId,
  currentShiftRevenue,
  onRegisterClosed,
}: {
  parkingLotId: string;
  currentShiftRevenue?: number;
  onRegisterClosed?: () => void;
}) {
  const [closures, setClosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosingRegister, setIsClosingRegister] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchClosures = useCallback(async () => {
    const { data } = await supabase
      .from("cash_closures")
      .select("*, profiles:closed_by(full_name, email)")
      .eq("parking_lot_id", parkingLotId)
      .order("closed_at", { ascending: false })
      .limit(50);

    if (data) setClosures(data);
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClosures();
  }, [fetchClosures]);

  const handleCloseRegister = async () => {
    if (
      !confirm(
        "¿Está seguro que desea cerrar la caja? El recaudo volverá a $0.",
      )
    )
      return;
    setIsClosingRegister(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Fetch last closure to determine opened_at
      const { data: lastClosure } = await supabase
        .from("cash_closures")
        .select("closed_at")
        .eq("parking_lot_id", parkingLotId)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const opened_at = lastClosure
        ? lastClosure.closed_at
        : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const { error: insertError } = await supabase.from("cash_closures").insert([
        {
          parking_lot_id: parkingLotId,
          total_revenue: currentShiftRevenue || 0,
          closed_by: session?.user?.id,
          opened_at: opened_at,
          notes: `Cierre de caja - Admin`,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("Caja cerrada exitosamente.");
      setTimeout(() => setSuccess(""), 3000);

      // Reload stats
      if (onRegisterClosed) {
        onRegisterClosed();
      }
      fetchClosures();
    } catch (err: any) {
      console.error("Error cerrado caja", err);
      setError("No se pudo cerrar la caja: " + err.message);
    } finally {
      setIsClosingRegister(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {currentShiftRevenue !== undefined && (
        <div className={`${styles.card} flex flex-col justify-center`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`${styles.statIconContainer} ${styles.statIconSuccess}`}>
                <DollarSign size={32} />
              </div>
              <div className="min-w-0">
                <h3 className={`${styles.cardTitle} truncate`}>
                  Recaudo Actual (En Caja)
                </h3>
                <p className={`${styles.cardValue} truncate`}>
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(currentShiftRevenue)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseRegister}
              disabled={isClosingRegister || currentShiftRevenue === 0}
              className={`${styles.btnSecondary} truncate w-full sm:w-auto`}
            >
              {isClosingRegister ? "Cerrando..." : "Cerrar Caja"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Historial de Cajas</h2>
      </div>

      {closures.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xl border border-slate-100">
          <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold">
            Aún no hay cierres de caja registrados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Apertura</th>
                  <th className="px-6 py-4">Cierre</th>
                  <th className="px-6 py-4">Recaudo</th>
                  <th className="px-6 py-4">Realizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closures.map((closure) => (
                  <tr
                    key={closure.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {closure.opened_at ? (
                        <div>
                          <p className="text-slate-900 font-bold flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400" />
                            {new Date(closure.opened_at).toLocaleDateString()}
                          </p>
                          <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            <Clock size={13} className="text-slate-400" />
                            {new Date(closure.opened_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          No registrado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-slate-900 font-bold flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {new Date(closure.closed_at).toLocaleDateString()}
                        </p>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                          <Clock size={13} className="text-slate-400" />
                          {new Date(closure.closed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-emerald-600 text-base">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(closure.total_revenue || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-900 font-bold">
                        {closure.profiles?.full_name ||
                          closure.notes?.split("-")[1]?.trim() ||
                          "Admin"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
