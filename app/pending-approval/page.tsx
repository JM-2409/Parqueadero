"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MonitorX, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "@/lib/supabase";

function PendingApprovalContent() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white -z-10"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-10 relative z-10 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.1,
          }}
          className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-50"
        >
          <MonitorX size={36} strokeWidth={2} />
        </motion.div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Aprobación Pendiente
        </h1>
        <p className="text-slate-500 mt-4 font-medium leading-relaxed">
          Has ingresado correctamente, pero este equipo aún no está autorizado para acceder al panel.
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Se ha enviado una solicitud a tu administrador. Por favor, espera a que aprueben tu acceso.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCcw size={20} />
            Verificar Estado
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">Cargando...</div>}>
      <PendingApprovalContent />
    </Suspense>
  );
}
