import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Devuelve la fecha LOCAL en formato AAAA-MM-DD (para inputs type="date" y
 * filtros por día). No usar `toISOString().split("T")[0]`: esa es la fecha
 * UTC y en Colombia (UTC-5) cambia al día siguiente desde las 7 p. m.
 */
export function toLocalDateInput(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type SessionVehicle = {
  plate: string;
  type: string;
  brand?: string;
  color?: string;
  owner_name?: string;
  custom_fields_data?: Record<string, unknown>;
};

/**
 * Supabase a veces devuelve la relación `vehicles` como objeto y a veces como
 * arreglo. Esta función unifica ambos casos para no perder placa ni tipo.
 */
export function getSessionVehicle(
  session: { vehicles?: unknown } | null | undefined,
): SessionVehicle {
  const raw = session?.vehicles;
  const vehicle = Array.isArray(raw) ? raw[0] : raw;
  if (!vehicle || typeof vehicle !== "object") {
    return { plate: "", type: "" };
  }
  const v = vehicle as Record<string, unknown>;
  return {
    plate: String(v.plate ?? ""),
    type: String(v.type ?? ""),
    brand: typeof v.brand === "string" ? v.brand : undefined,
    color: typeof v.color === "string" ? v.color : undefined,
    owner_name: typeof v.owner_name === "string" ? v.owner_name : undefined,
    custom_fields_data:
      v.custom_fields_data && typeof v.custom_fields_data === "object"
        ? (v.custom_fields_data as Record<string, unknown>)
        : undefined,
  };
}

export function withNormalizedVehicle<T extends { vehicles?: unknown }>(
  session: T,
): T & { vehicles: SessionVehicle } {
  return { ...session, vehicles: getSessionVehicle(session) };
}

export function formatElapsedDuration(entryTime: string | Date, now: Date = new Date()): string {
  const start = new Date(entryTime).getTime();
  const elapsedMs = Math.max(0, now.getTime() - start);
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}
