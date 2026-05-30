import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export function SuccessMessage({ message }: { message: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      // Pequeño delay inicial para asegurar que el render del DOM ocurra antes de cambiar opacity
      const showTimer = setTimeout(() => setIsVisible(true), 10);

      // La notificación dura en pantalla 2 segundos (2000 ms) antes de desvanecerse
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4 transition-all duration-500 ease-out">
      {/* Fondo levemente oscuro (opcional) para destacar la ventana en el centro */}
      <div
        className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className={`relative bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] rounded-3xl flex flex-col items-center justify-center p-8 pb-10 min-w-[280px] max-w-sm transition-all duration-500 ease-out transform ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-8"
        }`}
      >
        <div
          className={`rounded-full bg-emerald-100 p-4 mb-4 transition-all duration-500 delay-100 ease-out transform ${
            isVisible ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-45 opacity-0"
          }`}
        >
          <CheckCircle2 size={64} className="text-emerald-500 drop-shadow-sm" strokeWidth={2.5} />
        </div>
        <div className="text-center text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
          {message}
        </div>
      </div>
    </div>
  );
}
