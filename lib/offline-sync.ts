import { supabase } from "@/lib/supabase";

export interface PendingOfflineAction {
  id: string;
  type: "entry" | "exit";
  timestamp: string;
  payload: any;
}

const OFFLINE_QUEUE_KEY = "nexopark_offline_queue_v1";

/**
 * Obtiene la cola de acciones almacenadas sin conexión.
 */
export function getOfflineQueue(): PendingOfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error al leer la cola offline:", e);
    return [];
  }
}

/**
 * Guarda una nueva acción en la cola offline.
 */
export function enqueueOfflineAction(action: Omit<PendingOfflineAction, "id" | "timestamp">): PendingOfflineAction {
  const queue = getOfflineQueue();
  const newAction: PendingOfflineAction = {
    ...action,
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  queue.push(newAction);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error al guardar acción offline:", e);
  }
  return newAction;
}

/**
 * Remueve una acción procesada de la cola offline.
 */
export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((a) => a.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error al limpiar acción offline:", e);
  }
}

/**
 * Sincroniza todas las acciones acumuladas en la cola con Supabase.
 */
export async function syncOfflineQueue(): Promise<{ successCount: number; failedCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { successCount: 0, failedCount: 0 };

  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      if (item.type === "entry") {
        const { error } = await supabase.from("parking_sessions").insert(item.payload);
        if (!error) {
          removeOfflineAction(item.id);
          successCount++;
        } else {
          console.error("Error al sincronizar entrada offline:", error);
          failedCount++;
        }
      } else if (item.type === "exit") {
        const { id: sessionId, ...updates } = item.payload;
        const { error } = await supabase
          .from("parking_sessions")
          .update(updates)
          .eq("id", sessionId);
        if (!error) {
          removeOfflineAction(item.id);
          successCount++;
        } else {
          console.error("Error al sincronizar salida offline:", error);
          failedCount++;
        }
      }
    } catch (err) {
      console.error("Excepción durante sincronización offline:", err);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
