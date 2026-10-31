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
