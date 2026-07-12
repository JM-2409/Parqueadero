import { ReactNode, ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "outline";
  className?: string;
}

export function Button({
  children,
  isLoading,
  variant = "primary",
  className = "",
  disabled,
  title,
  ...props
}: ButtonProps) {
  const isOnline = useOnlineStatus();
  const shouldBeDisabled = disabled || isLoading || !isOnline;

  const baseStyle =
    "flex items-center justify-center gap-2 font-medium transition-all duration-300 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed relative group";

  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95",
    danger:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md active:scale-95",
    outline:
      "border-2 border-slate-200 hover:border-slate-300 text-slate-700 bg-transparent active:scale-95",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={shouldBeDisabled}
      title={!isOnline ? "Requiere conexión a internet" : title}
      {...props}
    >
      {isLoading ? <Spinner size={20} /> : children}
      {!isOnline && (
        <div className="absolute inset-0 bg-slate-400/10 rounded-xl pointer-events-none" />
      )}
    </button>
  );
}
