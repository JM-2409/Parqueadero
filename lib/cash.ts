import { supabase } from "@/lib/supabase";

/**
 * Resumen de la caja abierta (desde el último cierre hasta ahora).
 * Lo calcula la base de datos con la función `get_cash_register_summary`,
 * así el panel del empleado, el del administrador y los reportes usan
 * exactamente la misma regla.
 */
export interface CashRegisterSummary {
  lastClosureAt: string | null;
  openedAt: string | null;
  sessionsCount: number;
  revenue: number;
  withdrawals: number;
  cashInRegister: number;
  excludedCount: number;
  excludedAmount: number;
}

export interface CashClosure {
  id: string;
  parking_lot_id: string;
  closed_at: string;
  opened_at: string | null;
  closed_by: string | null;
  expected_revenue: number | null;
  withdrawn_amount: number | null;
  total_revenue: number | null;
  notes: string | null;
  [key: string]: unknown;
}

export const EMPTY_CASH_SUMMARY: CashRegisterSummary = {
  lastClosureAt: null,
  openedAt: null,
  sessionsCount: 0,
  revenue: 0,
  withdrawals: 0,
  cashInRegister: 0,
  excludedCount: 0,
  excludedAmount: 0,
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function parseCashSummary(raw: unknown): CashRegisterSummary {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CASH_SUMMARY };
  const r = raw as Record<string, unknown>;
  return {
    lastClosureAt: (r.last_closure_at as string) ?? null,
    openedAt: (r.opened_at as string) ?? null,
    sessionsCount: toNumber(r.sessions_count),
    revenue: toNumber(r.revenue),
    withdrawals: toNumber(r.withdrawals),
    cashInRegister: toNumber(r.cash_in_register),
    excludedCount: toNumber(r.excluded_count),
    excludedAmount: toNumber(r.excluded_amount),
  };
}

export async function fetchCashSummary(parkingLotId: string): Promise<CashRegisterSummary> {
  const { data, error } = await supabase.rpc("get_cash_register_summary", {
    p_parking_lot_id: parkingLotId,
  });
  if (error) throw error;
  return parseCashSummary(data);
}

export async function closeCashRegister(parkingLotId: string, notes?: string): Promise<CashClosure> {
  const { data, error } = await supabase.rpc("close_cash_register", {
    p_parking_lot_id: parkingLotId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("La base de datos no devolvió el cierre de caja.");
  return row as CashClosure;
}

/**
 * Lee el estado actual de la pausa global de caja directamente de la base,
 * para no depender de un valor viejo cargado al abrir la pantalla.
 */
export async function fetchIsCashPaused(parkingLotId: string, fallback = false): Promise<boolean> {
  const { data, error } = await supabase
    .from("parking_lots")
    .select("features")
    .eq("id", parkingLotId)
    .maybeSingle();
  if (error || !data) return fallback;
  return Boolean((data.features as Record<string, unknown> | null)?.is_cash_paused);
}

/**
 * Campos que se deben guardar en una sesión al cobrarla.
 * `include_in_cash` es la fuente de verdad; `extra_data.is_paused` se mantiene
 * por compatibilidad con versiones anteriores de la aplicación.
 */
export function cashFields(includeInCash: boolean, extraData: Record<string, unknown> | null | undefined) {
  return {
    include_in_cash: includeInCash,
    extra_data: { ...(extraData || {}), is_paused: !includeInCash },
  };
}

/** Determina si una sesión cobrada cuenta para la caja. */
export function isCountedInCash(session: {
  status?: string | null;
  include_in_cash?: boolean | null;
  extra_data?: Record<string, unknown> | null;
}): boolean {
  if (session.status && session.status !== "completed") return false;
  if (typeof session.include_in_cash === "boolean") return session.include_in_cash;
  return !session.extra_data?.is_paused;
}

/** Fecha en que el cobro entró a caja (con respaldo en la hora de salida). */
export function cashDate(session: { cash_recorded_at?: string | null; exit_time?: string | null }): string | null {
  return session.cash_recorded_at || session.exit_time || null;
}

export const formatCOP = (value: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

/** Claves internas de extra_data que no deben mostrarse al usuario. */
const INTERNAL_EXTRA_KEYS = new Set(["is_paused"]);

/** Devuelve extra_data sin las claves internas de control de caja. */
export function publicExtraData(data?: Record<string, any> | null): Record<string, any> {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([k]) => !INTERNAL_EXTRA_KEYS.has(k)),
  );
}
