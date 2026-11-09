"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error";
import {
  addDaysToSubscriptionDate,
  formatSubscriptionDate,
  formatSubscriptionPrice,
  getSubscriptionPeriodEnd,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/lib/subscriptions";
import { Spinner } from "@/components/ui/Spinner";

interface ParkingLot {
  id: string;
  name: string;
  plan_id: string | null;
  subscription_end_date: string | null;
  is_suspended: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  parking_lot_id: string | null;
  parking_lot_name: string;
  plan_id: string | null;
  plan_name: string;
  amount: number;
  currency: string;
  status: "draft" | "pending" | "paid" | "overdue" | "void";
  period_start: string | null;
  period_end: string | null;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
}

interface Payment {
  id: string;
  invoice_id: string | null;
  parking_lot_id: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
}

interface PlanDraft {
  name: string;
  description: string;
  price: string;
  billing_interval: BillingInterval;
  max_branches: string;
  allow_custom_roles: boolean;
  allow_monthly_subscribers: boolean;
  is_active: boolean;
}

const EMPTY_PLAN: PlanDraft = {
  name: "",
  description: "",
  price: "",
  billing_interval: "monthly",
  max_branches: "1",
  allow_custom_roles: false,
  allow_monthly_subscribers: false,
  is_active: true,
};

const moneyMethods = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia bancaria" },
  { value: "other", label: "Otro medio manual" },
];

function getInvoiceStatus(invoice: Invoice): Invoice["status"] {
  if (
    invoice.status === "pending" &&
    invoice.due_at &&
    formatSubscriptionDate(invoice.due_at) < formatSubscriptionDate(new Date())
  ) {
    return "overdue";
  }
  return invoice.status;
}

function formatPlanDraft(plan: SubscriptionPlan): PlanDraft {
  return {
    name: plan.name,
    description: plan.description || "",
    price: String(plan.price),
    billing_interval: plan.billing_interval,
    max_branches: String(plan.max_branches),
    allow_custom_roles: plan.allow_custom_roles,
    allow_monthly_subscribers: plan.allow_monthly_subscribers,
    is_active: plan.is_active,
  };
}

export default function SubscriptionManagement() {
  const [section, setSection] = useState<"plans" | "invoices" | "payments">(
    "plans",
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planDraft, setPlanDraft] = useState<PlanDraft>(EMPTY_PLAN);
  const [invoiceForm, setInvoiceForm] = useState({
    parkingLotId: "",
    planId: "",
    periodStart: "",
    periodEnd: "",
    dueDate: "",
    notes: "",
  });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(false);
  const didInitializePlanForm = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [
        plansResult,
        lotsResult,
        invoicesResult,
        paymentsResult,
        userResult,
      ] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select(
            "id, name, price, description, currency, billing_interval, max_branches, allow_custom_roles, allow_monthly_subscribers, is_active",
          )
          .order("price", { ascending: true }),
        supabase
          .from("parking_lots")
          .select("id, name, plan_id, subscription_end_date, is_suspended")
          .order("name", { ascending: true }),
        supabase
          .from("subscription_invoices")
          .select(
            "id, invoice_number, parking_lot_id, parking_lot_name, plan_id, plan_name, amount, currency, status, period_start, period_end, issued_at, due_at, paid_at, notes",
          )
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("subscription_payments")
          .select(
            "id, invoice_id, parking_lot_id, amount, currency, method, status, reference, paid_at, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.auth.getUser(),
      ]);

      const queryError =
        plansResult.error ||
        lotsResult.error ||
        invoicesResult.error ||
        paymentsResult.error ||
        userResult.error;
      if (queryError) throw queryError;
      if (!userResult.data.user) {
        throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      }

      const loadedPlans = (plansResult.data || []) as SubscriptionPlan[];
      setPlans(loadedPlans);
      setParkingLots((lotsResult.data || []) as ParkingLot[]);
      setInvoices((invoicesResult.data || []) as Invoice[]);
      setPayments((paymentsResult.data || []) as Payment[]);
      if (!didInitializePlanForm.current) {
        const firstPlan = loadedPlans[0];
        if (firstPlan) {
          setSelectedPlanId(firstPlan.id);
          setPlanDraft(formatPlanDraft(firstPlan));
        }
        didInitializePlanForm.current = true;
      } else {
        setSelectedPlanId((current) =>
          current && loadedPlans.some((plan) => plan.id === current)
            ? current
            : loadedPlans[0]?.id || "",
        );
      }
    } catch (loadError: unknown) {
      console.error("Error al cargar la gestión de suscripciones:", loadError);
      setError(
        "No se pudo cargar la información de suscripciones: " +
          getErrorMessage(loadError),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const buildInvoicePeriod = (parkingLotId: string, planId: string) => {
    const lot = parkingLots.find((parkingLot) => parkingLot.id === parkingLotId);
    const plan = plans.find((item) => item.id === planId);
    if (!lot || !plan || !plan.is_active) return {};
    const today = formatSubscriptionDate(new Date());
    const currentEndDate = lot.subscription_end_date
      ? formatSubscriptionDate(lot.subscription_end_date)
      : "";
    const startDate =
      currentEndDate && currentEndDate >= today
        ? addDaysToSubscriptionDate(currentEndDate, 1)
        : today;

    return {
      periodStart: startDate,
      periodEnd: getSubscriptionPeriodEnd(startDate, plan.billing_interval),
      dueDate: addDaysToSubscriptionDate(today, 7),
    };
  };

  const handleInvoiceSelectionChange = (
    field: "parkingLotId" | "planId",
    value: string,
  ) => {
    const nextParkingLotId =
      field === "parkingLotId" ? value : invoiceForm.parkingLotId;
    const nextPlanId = field === "planId" ? value : invoiceForm.planId;
    setInvoiceForm((current) => ({
      ...current,
      [field]: value,
      ...buildInvoicePeriod(nextParkingLotId, nextPlanId),
    }));
  };

  const pendingInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        ["pending", "overdue"].includes(getInvoiceStatus(invoice)),
      ),
    [invoices],
  );
  const currentInvoiceId = pendingInvoices.some(
    (invoice) => invoice.id === selectedInvoiceId,
  )
    ? selectedInvoiceId
    : pendingInvoices[0]?.id || "";
  const selectedInvoice = pendingInvoices.find(
    (invoice) => invoice.id === currentInvoiceId,
  );

  const activePlansCount = plans.filter((plan) => plan.is_active).length;
  const pendingInvoicesCount = pendingInvoices.length;
  const confirmedPaymentsTotal = payments
    .filter((payment) => payment.status === "confirmed")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleRefresh = () => {
    resetMessages();
    setLoading(true);
    void loadData();
  };

  const handleSavePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    const price = Number(planDraft.price);
    const maxBranches = Number(planDraft.max_branches);
    if (!planDraft.name.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Ingresa el nombre y un precio mayor que cero para el plan.");
      return;
    }
    if (!Number.isInteger(maxBranches) || maxBranches < 1) {
      setError("El plan debe permitir al menos una sede.");
      return;
    }

    setSaving(true);
    try {
      const planData = {
        name: planDraft.name.trim(),
        description: planDraft.description.trim() || null,
        price,
        currency: "COP",
        billing_interval: planDraft.billing_interval,
        max_branches: maxBranches,
        allow_custom_roles: planDraft.allow_custom_roles,
        allow_monthly_subscribers: planDraft.allow_monthly_subscribers,
        is_active: planDraft.is_active,
      };

      if (selectedPlanId) {
        const { error: updateError } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", selectedPlanId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("subscription_plans")
          .insert(planData)
          .select("id")
          .single();
        if (insertError) throw insertError;
        setSelectedPlanId(data.id);
      }

      setSuccess(
        selectedPlanId
          ? "El plan se actualizó correctamente."
          : "El plan se creó correctamente.",
      );
      if (!selectedPlanId) setPlanDraft(EMPTY_PLAN);
      await loadData();
    } catch (saveError: unknown) {
      console.error("Error al guardar el plan:", saveError);
      setError("No se pudo guardar el plan: " + getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    resetMessages();

    const lot = parkingLots.find(
      (item) => item.id === invoiceForm.parkingLotId,
    );
    const plan = plans.find((item) => item.id === invoiceForm.planId);
    if (!lot || !plan || !plan.is_active) {
      setError("Selecciona un parqueadero y un plan activo.");
      return;
    }
    if (Number(plan.price) <= 0) {
      setError("No se puede emitir una factura para un plan sin costo.");
      return;
    }
    if (
      !invoiceForm.periodStart ||
      !invoiceForm.periodEnd ||
      invoiceForm.periodEnd < invoiceForm.periodStart ||
      invoiceForm.periodEnd < formatSubscriptionDate(new Date())
    ) {
      setError("El período debe ser válido y no puede finalizar en el pasado.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("La sesión expiró. Inicia sesión nuevamente.");

      const dateCode = formatSubscriptionDate(new Date()).replaceAll("-", "");
      const invoiceNumber = `NP-${dateCode}-${crypto.randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;
      const dueAt = invoiceForm.dueDate
        ? new Date(`${invoiceForm.dueDate}T23:59:59-05:00`).toISOString()
        : null;
      const { error: invoiceError } = await supabase
        .from("subscription_invoices")
        .insert({
          invoice_number: invoiceNumber,
          parking_lot_id: lot.id,
          parking_lot_name: lot.name,
          plan_id: plan.id,
          plan_name: plan.name,
          amount: plan.price,
          currency: plan.currency,
          status: "pending",
          period_start: invoiceForm.periodStart,
          period_end: invoiceForm.periodEnd,
          due_at: dueAt,
          notes: invoiceForm.notes.trim() || null,
          created_by: user.id,
        });
      if (invoiceError) throw invoiceError;

      setSuccess(`Se creó la factura ${invoiceNumber}.`);
      setInvoiceForm((current) => ({ ...current, notes: "" }));
      await loadData();
    } catch (createError: unknown) {
      console.error("Error al crear la factura:", createError);
      setError("No se pudo crear la factura: " + getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    resetMessages();

    const invoice = pendingInvoices.find(
      (item) => item.id === currentInvoiceId,
    );
    if (!invoice) {
      setError("Selecciona una factura pendiente.");
      return;
    }
    if (!paymentReceived) {
      setError("Confirma que el dinero ya fue recibido antes de registrar el pago.");
      return;
    }

    setSaving(true);
    try {
      const { error: paymentError } = await supabase.rpc(
        "record_subscription_payment",
        {
          p_invoice_id: invoice.id,
          p_method: paymentMethod,
          p_reference: paymentReference.trim() || null,
        },
      );
      if (paymentError) throw paymentError;

      setSuccess(
        `Pago confirmado. El plan y la vigencia de ${invoice.parking_lot_name} fueron actualizados.`,
      );
      setPaymentReference("");
      setPaymentReceived(false);
      await loadData();
    } catch (paymentError: unknown) {
      console.error("Error al registrar el pago:", paymentError);
      setError("No se pudo registrar el pago: " + getErrorMessage(paymentError));
    } finally {
      setSaving(false);
    }
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (
      !window.confirm(
        `¿Quieres anular la factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    resetMessages();
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("subscription_invoices")
        .update({ status: "void" })
        .eq("id", invoice.id)
        .in("status", ["pending", "overdue"]);
      if (updateError) throw updateError;

      setSuccess(`La factura ${invoice.invoice_number} fue anulada.`);
      await loadData();
    } catch (voidError: unknown) {
      console.error("Error al anular la factura:", voidError);
      setError("No se pudo anular la factura: " + getErrorMessage(voidError));
    } finally {
      setSaving(false);
    }
  };

  const startNewPlan = () => {
    resetMessages();
    setSelectedPlanId("");
    setPlanDraft(EMPTY_PLAN);
  };

  if (loading && plans.length === 0 && invoices.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner size={32} className="text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Administración comercial
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Planes y suscripciones
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Administra planes, factura períodos y registra pagos recibidos.
              Los pagos se anotan manualmente; no se realizan cobros automáticos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Planes activos" value={String(activePlansCount)} />
          <SummaryCard
            label="Facturas por cobrar"
            value={String(pendingInvoicesCount)}
          />
          <SummaryCard
            label="Pagos confirmados recientes"
            value={formatSubscriptionPrice(confirmedPaymentsTotal)}
          />
        </div>
      </header>

      {(error || success) && (
        <div
          role={error ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="text-sm font-semibold">{error || success}</p>
          <button
            type="button"
            onClick={resetMessages}
            className="ml-auto"
            aria-label="Cerrar mensaje"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <SectionButton
          active={section === "plans"}
          onClick={() => setSection("plans")}
          icon={<CreditCard size={17} />}
        >
          Planes
        </SectionButton>
        <SectionButton
          active={section === "invoices"}
          onClick={() => setSection("invoices")}
          icon={<FileText size={17} />}
        >
          Facturas
        </SectionButton>
        <SectionButton
          active={section === "payments"}
          onClick={() => setSection("payments")}
          icon={<CheckCircle2 size={17} />}
        >
          Pagos
        </SectionButton>
      </div>

      {section === "plans" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Planes configurados
                </h3>
                <p className="text-sm text-slate-500">
                  Los planes activos también se publican en la página principal.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewPlan}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800"
              >
                <Plus size={16} />
                Nuevo
              </button>
            </div>

            {plans.length === 0 ? (
              <EmptyState message="Todavía no hay planes creados." />
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setPlanDraft(formatPlanDraft(plan));
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      selectedPlanId === plan.id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {plan.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {plan.description || `${plan.max_branches} sede(s)`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-900">
                          {formatSubscriptionPrice(
                            Number(plan.price),
                            plan.currency,
                          )}
                        </p>
                        <span
                          className={`text-xs font-bold ${
                            plan.is_active ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          {plan.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <form
            onSubmit={handleSavePlan}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {selectedPlanId ? "Editar plan" : "Crear plan"}
              </h3>
              <p className="text-sm text-slate-500">
                Los cambios de precio no alteran facturas ya emitidas.
              </p>
            </div>

            <Field label="Nombre del plan">
              <input
                required
                value={planDraft.name}
                onChange={(event) =>
                  setPlanDraft({ ...planDraft, name: event.target.value })
                }
                className={inputClass}
                maxLength={80}
              />
            </Field>
            <Field label="Descripción pública">
              <textarea
                value={planDraft.description}
                onChange={(event) =>
                  setPlanDraft({
                    ...planDraft,
                    description: event.target.value,
                  })
                }
                className={inputClass}
                rows={2}
                maxLength={240}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio en pesos colombianos">
                <input
                  required
                  type="number"
                  min="0"
                  step="1000"
                  value={planDraft.price}
                  onChange={(event) =>
                    setPlanDraft({ ...planDraft, price: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Período">
                <select
                  value={planDraft.billing_interval}
                  onChange={(event) =>
                    setPlanDraft({
                      ...planDraft,
                      billing_interval: event.target.value as BillingInterval,
                    })
                  }
                  className={inputClass}
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </Field>
              <Field label="Máximo de sedes">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={planDraft.max_branches}
                  onChange={(event) =>
                    setPlanDraft({
                      ...planDraft,
                      max_branches: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <ToggleField
              label="Permitir roles personalizados"
              checked={planDraft.allow_custom_roles}
              onChange={(checked) =>
                setPlanDraft({ ...planDraft, allow_custom_roles: checked })
              }
            />
            <ToggleField
              label="Permitir abonados mensuales"
              checked={planDraft.allow_monthly_subscribers}
              onChange={(checked) =>
                setPlanDraft({
                  ...planDraft,
                  allow_monthly_subscribers: checked,
                })
              }
            />
            <ToggleField
              label="Publicar y permitir asignación del plan"
              checked={planDraft.is_active}
              onChange={(checked) =>
                setPlanDraft({ ...planDraft, is_active: checked })
              }
            />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Spinner size={18} /> : <Save size={18} />}
              Guardar plan
            </button>
          </form>
        </div>
      )}

      {section === "invoices" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
          <form
            onSubmit={handleCreateInvoice}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Emitir factura
              </h3>
              <p className="text-sm text-slate-500">
                El plan y la vigencia se aplican cuando el pago quede confirmado.
              </p>
            </div>

            <Field label="Parqueadero">
              <select
                required
                value={invoiceForm.parkingLotId}
                onChange={(event) =>
                  handleInvoiceSelectionChange(
                    "parkingLotId",
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">Selecciona un parqueadero</option>
                {parkingLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan activo">
              <select
                required
                value={invoiceForm.planId}
                onChange={(event) =>
                  handleInvoiceSelectionChange("planId", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Selecciona un plan</option>
                {plans
                  .filter((plan) => plan.is_active)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ·{" "}
                      {formatSubscriptionPrice(
                        Number(plan.price),
                        plan.currency,
                      )}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">
                <input
                  required
                  type="date"
                  value={invoiceForm.periodStart}
                  onChange={(event) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      periodStart: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Hasta">
                <input
                  required
                  type="date"
                  min={invoiceForm.periodStart}
                  value={invoiceForm.periodEnd}
                  onChange={(event) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      periodEnd: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Fecha límite de pago">
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    dueDate: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Notas (opcional)">
              <textarea
                rows={2}
                maxLength={500}
                value={invoiceForm.notes}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    notes: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
              Valor de la factura:{" "}
              <strong>
                {formatSubscriptionPrice(
                  Number(
                    plans.find((plan) => plan.id === invoiceForm.planId)?.price ||
                      0,
                  ),
                )}
              </strong>
            </div>
            <button
              type="submit"
              disabled={saving || parkingLots.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Spinner size={18} /> : <Plus size={18} />}
              Crear factura pendiente
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">
              Facturas recientes
            </h3>
            {invoices.length === 0 ? (
              <EmptyState message="Todavía no hay facturas." />
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => {
                  const status = getInvoiceStatus(invoice);
                  return (
                    <article
                      key={invoice.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-slate-900">
                            {invoice.invoice_number}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {invoice.parking_lot_name} · {invoice.plan_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Período: {invoice.period_start || "—"} a{" "}
                            {invoice.period_end || "—"}
                            {invoice.due_at
                              ? ` · Vence: ${formatSubscriptionDate(invoice.due_at)}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">
                            {formatSubscriptionPrice(
                              Number(invoice.amount),
                              invoice.currency,
                            )}
                          </p>
                          <StatusBadge status={status} />
                        </div>
                      </div>
                      {["pending", "overdue"].includes(status) && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleVoidInvoice(invoice)}
                          className="mt-3 text-xs font-bold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                        >
                          Anular factura
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {section === "payments" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
          <form
            onSubmit={handleRecordPayment}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Registrar pago recibido
              </h3>
              <p className="text-sm text-slate-500">
                Confirma solo pagos que ya recibiste. La activación se procesa
                de forma atómica en la base de datos. Los bloqueos manuales de
                acceso siguen siendo independientes.
              </p>
            </div>

            <Field label="Factura pendiente">
              <select
                required
                value={currentInvoiceId}
                onChange={(event) => setSelectedInvoiceId(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona una factura</option>
                {pendingInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} · {invoice.parking_lot_name} ·{" "}
                    {formatSubscriptionPrice(
                      Number(invoice.amount),
                      invoice.currency,
                    )}
                  </option>
                ))}
              </select>
            </Field>
            {selectedInvoice && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  Plan: <strong>{selectedInvoice.plan_name}</strong>
                </p>
                <p className="mt-1">
                  Vigencia: {selectedInvoice.period_start || "—"} a{" "}
                  {selectedInvoice.period_end || "—"}
                </p>
                <p className="mt-2 text-base font-extrabold text-slate-900">
                  Total:{" "}
                  {formatSubscriptionPrice(
                    Number(selectedInvoice.amount),
                    selectedInvoice.currency,
                  )}
                </p>
              </div>
            )}
            <Field label="Medio de pago">
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className={inputClass}
              >
                {moneyMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Referencia o comprobante (opcional)">
              <input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                className={inputClass}
                maxLength={120}
              />
            </Field>
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(event) => setPaymentReceived(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-700"
              />
              <span>
                Confirmo que el pago fue recibido por el valor completo de la
                factura.
              </span>
            </label>
            <button
              type="submit"
              disabled={saving || !selectedInvoice}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
              Confirmar pago y renovar período
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">
              Historial de pagos recientes
            </h3>
            {payments.length === 0 ? (
              <EmptyState message="Todavía no hay pagos registrados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-3 pr-3">Fecha</th>
                      <th className="py-3 pr-3">Factura</th>
                      <th className="py-3 pr-3">Medio</th>
                      <th className="py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const invoice = invoices.find(
                        (item) => item.id === payment.invoice_id,
                      );
                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-3 pr-3 text-slate-600">
                            {payment.paid_at
                              ? formatSubscriptionDate(payment.paid_at)
                              : formatSubscriptionDate(payment.created_at)}
                          </td>
                          <td className="py-3 pr-3 font-semibold text-slate-800">
                            {invoice?.invoice_number || "Factura anterior"}
                            {payment.reference && (
                              <span className="block text-xs font-normal text-slate-500">
                                Ref. {payment.reference}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-slate-600">
                            {moneyMethods.find(
                              (method) => method.value === payment.method,
                            )?.label || payment.method}
                          </td>
                          <td className="py-3 text-right font-bold text-slate-900">
                            {formatSubscriptionPrice(
                              Number(payment.amount),
                              payment.currency,
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function SectionButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
        active
          ? "bg-indigo-700 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-indigo-700"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const labels: Record<Invoice["status"], string> = {
    draft: "Borrador",
    pending: "Pendiente",
    paid: "Pagada",
    overdue: "Vencida",
    void: "Anulada",
  };
  const colors: Record<Invoice["status"], string> = {
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-emerald-100 text-emerald-800",
    overdue: "bg-rose-100 text-rose-800",
    void: "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
      {message}
    </div>
  );
}
