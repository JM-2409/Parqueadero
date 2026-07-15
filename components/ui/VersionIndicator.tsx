"use client";

import { usePathname } from "next/navigation";

export function VersionIndicator() {
  const pathname = usePathname();

  // El footer de la landing page (/) ya mostrará la versión detallada.
  // Solo renderizaremos este mini-footer en las vistas internas para evitar duplicaciones.
  if (pathname === "/") {
    return null;
  }

  return (
    <div className="text-xs text-slate-500 text-center py-4 bg-slate-50 border-t border-slate-100 mt-auto">
      <p>NexoPark v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</p>
    </div>
  );
}
