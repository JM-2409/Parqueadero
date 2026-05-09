import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export function SuccessMessage({ message }: { message: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // We recreate the state internally inside the timer setup so it triggers fresh
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2700);

    return () => clearTimeout(timer);
  }, [message]);

  // When message changes, we want to immediately make it visible during render
  const visibleClass = isVisible ? "opacity-100" : "opacity-0";

  if (!message) return null;

  return (
    <div
      className={`mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 transition-opacity duration-300 ${visibleClass}`}
    >
      <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
      <div className="flex-1 overflow-hidden break-words text-sm font-medium">
        {message}
      </div>
    </div>
  );
}
