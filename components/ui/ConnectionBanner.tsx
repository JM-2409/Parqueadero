"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function ConnectionBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-red-500 text-white py-2 px-4 flex items-center justify-center gap-2 z-[9999] sticky top-0 shadow-md"
        >
          <WifiOff size={18} className="animate-pulse" />
          <span className="text-sm font-medium">
            Sin conexión a internet - Algunas funciones no están disponibles
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
