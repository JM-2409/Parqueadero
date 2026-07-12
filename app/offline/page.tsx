"use client";

import { useEffect } from "react";
import { WifiOff, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const isOnline = useOnlineStatus();
  const router = useRouter();

  useEffect(() => {
    if (isOnline) {
      router.push("/");
    }
  }, [isOnline, router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full flex flex-col items-center gap-6 border border-slate-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
          <WifiOff size={40} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Sin conexión</h1>
          <p className="text-slate-600">
            Se requiere conexión a internet para usar esta aplicación y garantizar la integridad de los datos.
          </p>
        </div>

        <Button
          onClick={handleRetry}
          className="w-full py-4 text-lg"
          variant="primary"
        >
          <RefreshCcw size={20} />
          Reintentar
        </Button>

        <p className="text-xs text-slate-400 italic">
          La aplicación se recargará automáticamente cuando recuperes la conexión.
        </p>
      </div>
    </div>
  );
}
