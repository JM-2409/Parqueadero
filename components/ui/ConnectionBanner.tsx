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
          className="z-[9999] sticky top-0 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(244,63,94,0.95) 0%, rgba(249,115,22,0.95) 100%)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center justify-center gap-2.5 py-2.5 px-4">
            <WifiOff size={16} className="animate-pulse text-white" />
            <span className="text-sm font-semibold text-white">
              Sin conexión · Algunas funciones no están disponibles
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
