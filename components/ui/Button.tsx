import { ReactNode, ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "outline";
  className?: string;
}

export function Button({ children, isLoading, variant = "primary", className = "", disabled, ...props }: ButtonProps) {
  const baseStyle = "flex items-center justify-center gap-2 font-medium transition-all duration-300 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
    outline: "border-2 border-slate-200 hover:border-slate-300 text-slate-700 bg-transparent"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner size={20} /> : children}
    </button>
  );
}
