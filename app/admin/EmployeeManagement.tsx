"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import { UserPlus, X, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function EmployeeManagement({
  parkingLotId,
  initialEmployees,
}: {
  parkingLotId: string;
  initialEmployees: any[];
}) {
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const calculateStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const strength = calculateStrength(newEmployee.password);

  const getStrengthColor = () => {
    if (strength === 0) return "bg-slate-200";
    if (strength <= 25) return "bg-red-500";
    if (strength <= 50) return "bg-orange-500";
    if (strength <= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 25) return "Débil";
    if (strength <= 50) return "Regular";
    if (strength <= 75) return "Buena";
    return "Fuerte";
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingEmployee) return;
    setIsCreatingEmployee(true);
    setError("");
    setSuccess("");

    if (!newEmployee.username || newEmployee.username.trim().length < 4) {
      setError(
        "El nombre de usuario debe tener al menos 4 caracteres y no estar vacío.",
      );
      setIsCreatingEmployee(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newEmployee.username)) {
      setError(
        "El nombre de usuario solo puede contener letras, números y guiones bajos.",
      );
      setIsCreatingEmployee(false);
      return;
    }

    if (newEmployee.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsCreatingEmployee(false);
      return;
    }

    if (strength < 50) {
      setError(
        "La contraseña es muy débil. Debe incluir números y mayúsculas o símbolos.",
      );
      setIsCreatingEmployee(false);
      return;
    }

    if (newEmployee.password !== newEmployee.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setIsCreatingEmployee(false);
      return;
    }

    try {
      const email = `${newEmployee.username.trim()}@parkingapp.local`;
      const result = await createUser(
        email,
        newEmployee.password,
        "employee",
        parkingLotId,
      );

      if (!result.success) throw new Error(result.error);

      setSuccess("Empleado creado exitosamente");
      setNewEmployee({ username: "", password: "", confirmPassword: "" });

      // Refresh employees list local
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, parking_lot_id, created_at")
        .eq("parking_lot_id", parkingLotId)
        .eq("role", "employee");

      if (data) setEmployees(data);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      // Handle known Supabase Auth errors gracefully if possible
      const message = err.message || "Error al crear empleado";
      setError(
        message.includes("User already registered")
          ? "Este usuario ya existe en el sistema."
          : message,
      );
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3 font-bold text-sm">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Crear Usuario u Operario
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Registra nuevos operarios
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateEmployee} className="space-y-6">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={newEmployee.username}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  username: e.target.value.toLowerCase().replace(/\s/g, ""),
                })
              }
              className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
              placeholder="ej. empleado_1"
              required
            />
            <p className="text-xs text-slate-400 mt-2 font-bold">
              Solo minúsculas, números y guiones bajos. Mínimo 4 caracteres.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newEmployee.password}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, password: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength Indicator */}
              {newEmployee.password.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Seguridad
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${getStrengthColor().replace("bg-", "text-")}`}
                    >
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${strength}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newEmployee.confirmPassword}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`w-full text-sm rounded-3xl px-5 py-3 border-2 outline-none font-bold transition-all ${
                    newEmployee.confirmPassword
                      ? newEmployee.password === newEmployee.confirmPassword
                        ? "border-emerald-100 bg-emerald-50/30 focus:border-emerald-400 text-emerald-900"
                        : "border-red-100 bg-red-50/30 focus:border-red-400 text-red-900"
                      : "bg-slate-50 border-transparent focus:border-indigo-500"
                  }`}
                  placeholder="Repita la contraseña"
                  required
                />
                {newEmployee.confirmPassword &&
                  newEmployee.password === newEmployee.confirmPassword && (
                    <ShieldCheck
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                    />
                  )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreatingEmployee}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-3xl font-bold transition-all shadow-xl border border-slate-100 shadow-indigo-200 flex items-center justify-center gap-3 mt-4"
          >
            {isCreatingEmployee ? (
              <Spinner size={20} className="text-white" />
            ) : (
              <UserPlus size={20} />
            )}
            {isCreatingEmployee ? "Creando..." : "Crear Usuario u Operario"}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">
          Usuarios Registrados
        </h2>
        {employees.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
            <UserPlus size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-500">
              No hay usuarios registrados aún.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-3xl hover:border-indigo-100 hover:shadow-xl border border-slate-100 transition-all bg-white group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-100 transition-colors">
                    {(emp.email || emp.full_name || "U")
                      .replace("@parkingapp.local", "")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {(emp.email || emp.full_name || "Usuario").replace(
                        "@parkingapp.local",
                        "",
                      )}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 hover:text-slate-500">
                      Rol: Operario
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
