import React from "react";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
}

export function DeleteButton({ size = 18, className = "", ...props }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className={`p-2 rounded-xl text-slate-400 bg-slate-50 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center justify-center ${className}`}
      {...props}
    >
      <Trash2 size={size} strokeWidth={2} />
    </button>
  );
}
