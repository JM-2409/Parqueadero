"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/cash";
import { getErrorMessage } from "@/lib/error";

type Assignment = {
  id: string;
  employee_name: string;
  description: string;
  amount_delivered: number;
  created_at: string;
};

type InvoiceDraft = {
  id: number;
  invoice_number: string;
  description: string;
  amount: string;
};

const createInvoice = (id: number): InvoiceDraft => ({
  id,
  invoice_number: "",
  description: "",
  amount: "",
});

export default function CashMinorLegalization({
  parkingLotId,
  employeeName,
}: {
  parkingLotId: string;
  employeeName: string;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [invoices, setInvoices] = useState<InvoiceDraft[]>([createInvoice(0)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nextInvoiceId, setNextInvoiceId] = useState(1);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("cash_minor_assignments")
      .select("id, employee_name, description, amount_delivered, created_at")
      .eq("parking_lot_id", parkingLotId)
      .eq("employee_name", employeeName)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(`No se pudieron cargar las asignaciones: ${queryError.message}`);
    } else {
      setAssignments((data ?? []) as Assignment[]);
      setAssignmentId((current) => data?.some((item) => item.id === current) ? current : data?.[0]?.id ?? "");
    }
    setLoading(false);
  }, [employeeName, parkingLotId]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const selectedAssignment = assignments.find((item) => item.id === assignmentId);
  const invoiceTotal = useMemo(
    () => invoices.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0),
    [invoices],
  );
  const returnedAmount = Math.max(0, Number(selectedAssignment?.amount_delivered ?? 0) - invoiceTotal);

  const updateInvoice = (id: number, field: keyof Omit<InvoiceDraft, "id">, value: string) => {
    setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, [field]: value } : invoice));
  };

  const addInvoice = () => {
    setInvoices((current) => [...current, createInvoice(nextInvoiceId)]);
    setNextInvoiceId((current) => current + 1);
  };

  const submitLegalization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAssignment || saving) return;
    setError("");
    setSuccess("");

    const preparedInvoices = invoices.map(({ invoice_number, description, amount }) => ({
      invoice_number: invoice_number.trim(),
      description: description.trim(),
      amount: Number(amount),
    }));
    if (preparedInvoices.some((invoice) => !invoice.description || !Number.isFinite(invoice.amount) || invoice.amount <= 0)) {
      setError("Cada factura requiere una descripción y un monto mayor a cero.");
      return;
    }
    if (invoiceTotal <= 0 || invoiceTotal > Number(selectedAssignment.amount_delivered)) {
      setError("El total de las facturas debe ser mayor a cero y no superar el monto entregado.");
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc("cash_minor_legalize_assignment", {
        p_assignment_id: selectedAssignment.id,
        p_invoices: preparedInvoices,
      });
      if (rpcError) throw rpcError;
      setSuccess(`Legalización guardada. ${formatCOP(returnedAmount)} devueltos a caja menor.`);
      setInvoices([createInvoice(nextInvoiceId)]);
      setNextInvoiceId((current) => current + 1);
      await loadAssignments();
    } catch (caught) {
      setError(`No se pudo guardar la legalización: ${getErrorMessage(caught)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Legalización de caja menor</h1>
        <p className="mt-1 text-sm text-slate-600">Registra las facturas y devuelve a caja el saldo no utilizado.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}

      {loading ? <p className="rounded-2xl bg-white p-5 text-slate-600">Cargando asignaciones...</p> : assignments.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No tienes asignaciones pendientes de legalizar.</p>
      ) : (
        <form onSubmit={submitLegalization} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="block text-sm font-bold text-slate-700">
            Asignación pendiente
            <select required value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.description} · {formatCOP(Number(assignment.amount_delivered))} · {new Date(assignment.created_at).toLocaleDateString("es-CO")}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ReceiptText size={19} /> Facturas</h2>
              <button type="button" onClick={addInvoice} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">
                <Plus size={16} /> Agregar factura
              </button>
            </div>
            {invoices.map((invoice, index) => (
              <div key={invoice.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Descripción *
                  <input required maxLength={200} value={invoice.description} onChange={(event) => updateInvoice(invoice.id, "description", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder={`Factura ${index + 1}`} />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Número de factura
                  <input maxLength={100} value={invoice.invoice_number} onChange={(event) => updateInvoice(invoice.id, "invoice_number", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Monto *
                  <input required min="0.01" step="0.01" type="number" value={invoice.amount} onChange={(event) => updateInvoice(invoice.id, "amount", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                </label>
                {invoices.length > 1 && (
                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => setInvoices((current) => current.filter((item) => item.id !== invoice.id))} aria-label={`Eliminar factura ${index + 1}`} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:grid-cols-3">
            <div><p className="text-xs font-bold uppercase text-slate-600">Monto entregado</p><p className="font-black text-slate-900">{formatCOP(Number(selectedAssignment?.amount_delivered ?? 0))}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-600">Total de facturas</p><p className="font-black text-slate-900">{formatCOP(invoiceTotal)}</p></div>
            <div><p className="text-xs font-bold uppercase text-emerald-800">Devuelta a caja menor</p><p className="font-black text-emerald-800">{formatCOP(returnedAmount)}</p></div>
          </div>

          {invoiceTotal > Number(selectedAssignment?.amount_delivered ?? 0) && (
            <p className="text-sm font-semibold text-red-700">El total de facturas excede el monto entregado.</p>
          )}
          <button disabled={saving || !selectedAssignment || invoiceTotal <= 0 || invoiceTotal > Number(selectedAssignment?.amount_delivered ?? 0)} className="rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar legalización"}
          </button>
        </form>
      )}
    </section>
  );
}
