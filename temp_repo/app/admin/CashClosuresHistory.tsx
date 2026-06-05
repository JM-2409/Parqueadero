"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Calendar, DollarSign, X, HandCoins } from "lucide-react";
import styles from "./admin.module.css";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { sanitizeInput } from "@/lib/sanitize";

export default function CashClosuresHistory({
  parkingLotId,
  currentShiftRevenue,
  shiftWithdrawals = 0,
  onRegisterClosed,
}: {
  parkingLotId: string;
  currentShiftRevenue?: number;
  shiftWithdrawals?: number;
  onRegisterClosed?: () => void;
}) {
  const [closures, setClosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosingRegister, setIsClosingRegister] = useState(false);

  // Withdrawal Modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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

  const currentRegisterCash = Math.max(0, (currentShiftRevenue || 0) - (shiftWithdrawals || 0));

  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setWithdrawAmount("");
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    const formattedValue = new Intl.NumberFormat("es-CO").format(numericValue);
    setWithdrawAmount(formattedValue);
  };

  const handleWithdrawCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawWithdrawAmount = withdrawAmount.replace(/\D/g, "");

    if (!rawWithdrawAmount || !withdrawReason) {
      setError("Ingrese un monto y un motivo para el retiro.");
      return;
    }
    const amount = parseInt(rawWithdrawAmount, 10);
    if (amount <= 0) {
      setError("El monto a retirar debe ser mayor a 0.");
      return;
    }
    if (amount > currentRegisterCash) {
      setError("No hay suficiente dinero en caja para este retiro.");
      return;
    }

    setIsWithdrawing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { error: insertError } = await supabase.from("cash_withdrawals").insert([
        {
          parking_lot_id: parkingLotId,
          amount: amount,
          reason: sanitizeInput(withdrawReason),
          withdrawn_by: session?.user?.id,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("Dinero retirado exitosamente.");
      setTimeout(() => setSuccess(""), 3000);

      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawReason("");

      // Reload stats
      if (onRegisterClosed) {
        onRegisterClosed();
      }
    } catch (err: any) {
      console.error("Error al retirar dinero", err);
      setError("No se pudo retirar el dinero: " + err.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

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

      const closureNotes = "Cierre de caja - Admin";

      const { error: insertError } = await supabase.from("cash_closures").insert([
        {
          parking_lot_id: parkingLotId,
          total_revenue: currentRegisterCash,
          expected_revenue: currentShiftRevenue || 0,
          withdrawn_amount: shiftWithdrawals || 0,
          closed_by: session?.user?.id,
          opened_at: opened_at,
          notes: closureNotes,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${styles.card} flex flex-col justify-center bg-indigo-50 border-indigo-100`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`${styles.statIconContainer} bg-indigo-200 text-indigo-700`}>
                  <DollarSign size={32} />
                </div>
                <div className="min-w-0">
                  <h3 className={`${styles.cardTitle} truncate`}>
                    Total Turno
                  </h3>
                  <p className={`${styles.cardValue} truncate text-indigo-700`}>
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(currentShiftRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {shiftWithdrawals !== undefined && shiftWithdrawals > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-200/50 flex justify-between items-center text-sm">
                <span className="text-indigo-600/70 font-medium">Retiros realizados:</span>
                <span className="text-red-500 font-bold">
                  -{new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(shiftWithdrawals)}
                </span>
              </div>
            )}
          </div>

          <div className={`${styles.card} flex flex-col justify-center border-emerald-100 bg-emerald-50/30`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`${styles.statIconContainer} ${styles.statIconSuccess}`}>
                  <DollarSign size={32} />
                </div>
                <div className="min-w-0">
                  <h3 className={`${styles.cardTitle} truncate`}>
                    En Caja
                  </h3>
                  <p className={`${styles.cardValue} truncate text-emerald-700`}>
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(currentRegisterCash)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={currentRegisterCash <= 0 || isClosingRegister}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <HandCoins size={16} />
                  Retirar
                </button>
                <button
                  onClick={handleCloseRegister}
                  disabled={isClosingRegister || currentShiftRevenue === 0}
                  className={`${styles.btnSecondary} truncate w-full sm:w-auto min-w-[140px]`}
                >
                  {isClosingRegister ? "Cerrando..." : "Cerrar Caja"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <HandCoins className="text-indigo-600" />
                Retirar Dinero
              </h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWithdrawCash} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Monto a retirar
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={handleWithdrawAmountChange}
                    placeholder="0"
                    className={`${styles.inputField} pl-10`}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Máximo disponible: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(currentRegisterCash)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Motivo / Observaciones
                </label>
                <textarea
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="Ej: Pago de insumos, adelanto..."
                  className={`${styles.inputField} resize-none h-24`}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isWithdrawing ? "Retirando..." : "Confirmar Retiro"}
                </button>
              </div>
            </form>
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
                  <th className="px-6 py-4">Total Turno</th>
                  <th className="px-6 py-4">Retiros</th>
                  <th className="px-6 py-4">Total en Caja</th>
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
                      <p className="font-bold text-slate-700 text-base">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(closure.expected_revenue || closure.total_revenue || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-red-500 text-base">
                        {closure.withdrawn_amount && closure.withdrawn_amount > 0 ?
                          "-" + new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(closure.withdrawn_amount) : "$0"}
                      </p>
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
