export type BillingInterval = "monthly" | "quarterly" | "yearly";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  currency: string;
  billing_interval: BillingInterval;
  max_branches: number;
  allow_custom_roles: boolean;
  allow_monthly_subscribers: boolean;
  is_active: boolean;
}

export function formatSubscriptionDate(value: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDaysToSubscriptionDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getSubscriptionPeriodEnd(
  startDate: string,
  interval: BillingInterval,
): string {
  const [year, month, day] = startDate.split("-").map(Number);
  if (!year || !month || !day) return "";

  const intervalMonths = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
  }[interval];
  const targetMonth = month - 1 + intervalMonths;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const exclusiveEnd = new Date(
    Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)),
  );
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() - 1);
  return exclusiveEnd.toISOString().slice(0, 10);
}

export function formatSubscriptionPrice(price: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
