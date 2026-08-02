"use client";

import { useState, useEffect, useCallback } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { getOfflineQueue, syncOfflineQueue, PendingOfflineAction, enqueueOfflineAction } from "@/lib/offline-sync";

export function useOfflineQueue() {
  const isOnline = useOnlineStatus();
  const [pendingActions, setPendingActions] = useState<PendingOfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ successCount: number; failedCount: number } | null>(null);

  const refreshQueue = useCallback(() => {
    setPendingActions(getOfflineQueue());
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncOfflineQueue();
      setLastSyncResult(res);
      refreshQueue();
    } catch (e) {
      console.error("Falló la sincronización offline:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshQueue]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Sincronizar automáticamente cuando vuelve la conexión a internet
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline, triggerSync]);

  const addOfflineEntry = useCallback(
    (payload: any) => {
      const action = enqueueOfflineAction({ type: "entry", payload });
      refreshQueue();
      return action;
    },
    [refreshQueue]
  );

  const addOfflineExit = useCallback(
    (payload: any) => {
      const action = enqueueOfflineAction({ type: "exit", payload });
      refreshQueue();
      return action;
    },
    [refreshQueue]
  );

  return {
    isOnline,
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    lastSyncResult,
    triggerSync,
    addOfflineEntry,
    addOfflineExit,
    refreshQueue,
  };
}
