"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowDownToLine, Plus, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/cash";
import { getErrorMessage } from "@/lib/error";

type Assignment = {
  id: string;
  employee_name: string;
  description: string;
  amount_delivered: number;
  amount_spent: number;
  amount_returned: number;
  status: string;
  created_at: string;
};

type Movement = {
  id: string;
  assignment_id: string | null;
  movement_type: string;
  amount: number;
  balance_delta: number;
  status: "activo" | "anulado";
  description: string;
  created_at: string;
};

const movementNames: Record<string, string> = {
  funding: "Inyección de saldo",
  assignment: "Asignación",
  assignment_increase: "Aumento de asignación",
  return: "Devolución",
  annulment: "Anulación",
};

export default function CashMinorManagement({ parkingLotId }: { parkingLotId: string }) {
  const [balance, setBalance] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [fundDescription, setFundDescription] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentAmount, setAssignmentAmount] = useState("");
  const [increaseAmounts, setIncreaseAmounts] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [balanceResult, assignmentsResult, historyResult] = await Promise.all([
      supabase.from("cash_minor_balances").select("balance").eq("parking_lot_id", parkingLotId).maybeSingle(),
      supabase.from("cash_minor_assignments").select("*").eq("parking_lot_id", parkingLotId).order("created_at", { ascending: false }).limit(50),
      supabase.from("cash_minor_history").select("*").eq("parking_lot_id", parkingLotId).order("created_at", { ascending: false }).limit(100),
    ]);

    const queryError = balanceResult.error || assignmentsResult.error || historyResult.error;
    if (queryError) {
      setError(`No se pudo cargar la caja menor: ${queryError.message}`);
    } else {
      setBalance(Number(balanceResult.data?.balance ?? 0));
      setAssignments((assignmentsResult.data ?? []) as Assignment[]);
      setHistory((historyResult.data ?? []) as Movement[]);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const submitMovement = async (
    event: React.FormEvent<HTMLFormElement>,
    action: string,
    params: Record<string, unknown>,
    reset: () => void,
  ) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: rpcError } = await supabase.rpc(action, params);
      if (rpcError) throw rpcError;
      reset();
      setSuccess("Movimiento registrado correctamente.");
      await loadData();
    } catch (caught) {
      setError(`No se pudo registrar el movimiento: ${getErrorMessage(caught)}`);
    } finally {
      setSaving(false);
    }
  };

  const annulMovement = async (movement: Movement) => {
    if (!window.confirm(`¿Anular "${movement.description}" por ${formatCOP(movement.amount)}?`)) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: rpcError } = await supabase.rpc("cash_minor_annul_movement", {
        p_movement_id: movement.id,
      });
      if (rpcError) throw rpcError;
      setSuccess("Movimiento anulado y saldo actualizado.");
      await loadData();
    } catch (caught) {
      setError(`No se pudo anular el movimiento: ${getErrorMessage(caught)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Caja menor</h1>
          <p className="mt-1 text-sm text-slate-600">Control de fondos, asignaciones y legalizaciones.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <Wallet className="text-emerald-700" size={24} />
          <div>
            <p className="text-xs font-bold uppercase text-emerald-800">Saldo disponible</p>
            <p className="text-xl font-black text-emerald-900">{formatCOP(balance)}</p>
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={(event) => submitMovement(event, "cash_minor_add_funds", {
            p_parking_lot_id: parkingLotId,
            p_amount: Number(fundAmount),
            p_description: fundDescription.trim() || "Inyección de saldo",
          }, () => { setFundAmount(""); setFundDescription(""); })}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Plus size={19} /> Inyectar saldo</h2>
          <label className="block text-sm font-semibold text-slate-700">
            Monto
            <input required min="1" step="0.01" type="number" value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Motivo
            <input value={fundDescription} onChange={(event) => setFundDescription(event.target.value)} maxLength={200} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Reposición de caja" />
          </label>
          <button disabled={saving} className="rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Guardando..." : "Agregar saldo"}</button>
        </form>

        <form
          onSubmit={(event) => submitMovement(event, "cash_minor_create_assignment", {
            p_parking_lot_id: parkingLotId,
            p_employee_name: employeeName.trim(),
            p_description: assignmentDescription.trim(),
            p_amount: Number(assignmentAmount),
          }, () => { setEmployeeName(""); setAssignmentDescription(""); setAssignmentAmount(""); })}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ArrowDownToLine size={19} /> Crear asignación</h2>
          <label className="block text-sm font-semibold text-slate-700">
            Guarda u operador
            <input required value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Motivo
            <input required value={assignmentDescription} onChange={(event) => setAssignmentDescription(event.target.value)} maxLength={200} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Monto entregado
            <input required min="1" step="0.01" type="number" value={assignmentAmount} onChange={(event) => setAssignmentAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <button disabled={saving} className="rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Guardando..." : "Crear asignación"}</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Asignaciones</h2>
        </div>
        {loading ? <p className="p-5 text-sm text-slate-600">Cargando...</p> : assignments.length === 0 ? <p className="p-5 text-sm text-slate-600">Aún no hay asignaciones.</p> : (
          <div className="divide-y divide-slate-100">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-bold text-slate-900">{assignment.employee_name} · {assignment.description}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Entregado: {formatCOP(Number(assignment.amount_delivered))} · Gastado: {formatCOP(Number(assignment.amount_spent))} · Devuelto: {formatCOP(Number(assignment.amount_returned))}
                  </p>
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${assignment.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    {assignment.status === "pending" ? "Pendiente" : assignment.status === "legalized" ? "Legalizada" : "Anulada"}
                  </span>
                </div>
                {assignment.status === "pending" && (
                  <form
                    onSubmit={(event) => submitMovement(event, "cash_minor_increase_assignment", {
                      p_assignment_id: assignment.id,
                      p_amount: Number(increaseAmounts[assignment.id]),
                    }, () => setIncreaseAmounts((current) => ({ ...current, [assignment.id]: "" })))}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input aria-label="Monto adicional" required min="1" step="0.01" type="number" value={increaseAmounts[assignment.id] ?? ""} onChange={(event) => setIncreaseAmounts((current) => ({ ...current, [assignment.id]: event.target.value }))} className="w-36 rounded-xl border border-slate-300 px-3 py-2" />
                    <button disabled={saving} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 disabled:opacity-50">Añadir saldo</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Historial de caja menor</h2>
        </div>
        {loading ? <p className="p-5 text-sm text-slate-600">Cargando...</p> : history.length === 0 ? <p className="p-5 text-sm text-slate-600">Aún no hay movimientos.</p> : (
          <div className="divide-y divide-slate-100">
            {history.map((movement) => (
              <article key={movement.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-bold text-slate-900">{movementNames[movement.movement_type] ?? movement.movement_type}</p>
                  <p className="text-sm text-slate-600">{movement.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(movement.created_at).toLocaleString("es-CO")}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${Number(movement.balance_delta) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {Number(movement.balance_delta) >= 0 ? "+" : "-"}{formatCOP(Number(movement.amount))}
                    </p>
                    <p className={`text-xs font-bold ${movement.status === "activo" ? "text-emerald-700" : "text-slate-500"}`}>{movement.status}</p>
                  </div>
                  {movement.status === "activo" && movement.movement_type !== "annulment" && (
                    <button
                      onClick={() => void annulMovement(movement)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <AlertTriangle size={15} /> Anular
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
