"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import { UserPlus, X, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function EmployeeManagement({ 
  parkingLotId, 
  customRoles,
  initialEmployees 
}: { 
  parkingLotId: string, 
  customRoles: any[],
  initialEmployees: any[]
}) {
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [newEmployee, setNewEmployee] = useState({ username: "", password: "", confirmPassword: "", customRoleId: "" });
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
      setError("El nombre de usuario debe tener al menos 4 caracteres y no estar vacío.");
      setIsCreatingEmployee(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newEmployee.username)) {
      setError("El nombre de usuario solo puede contener letras, números y guiones bajos.");
      setIsCreatingEmployee(false);
      return;
    }

    if (newEmployee.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsCreatingEmployee(false);
      return;
    }

    if (strength < 50) {
      setError("La contraseña es muy débil. Debe incluir números y mayúsculas o símbolos.");
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
      const result = await createUser(email, newEmployee.password, "employee", parkingLotId);
      
      if (!result.success) throw new Error(result.error);
      
      if (newEmployee.customRoleId && result.user?.id) {
        // Update user with custom role
        await supabase
          .from("profiles")
          .update({ custom_role_id: newEmployee.customRoleId })
          .eq("id", result.user.id);
      }

      setSuccess("Empleado creado exitosamente");
      setNewEmployee({ username: "", password: "", confirmPassword: "", customRoleId: "" });
      
      // Refresh employees list local
      const { data } = await supabase
        .from("profiles")
        .select("*, custom_roles(name)")
        .eq("parking_lot_id", parkingLotId)
        .eq("role", "employee");
        
      if (data) setEmployees(data);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      // Handle known Supabase Auth errors gracefully if possible
      const message = err.message || "Error al crear empleado";
      setError(message.includes("User already registered") ? "Este usuario ya existe en el sistema." : message);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <UserPlus size={24} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Crear Empleado</h2>
        </div>

        <form onSubmit={handleCreateEmployee} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={newEmployee.username}
              onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="ej. empleado_1"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Solo minúsculas, números y guiones bajos. Mínimo 4 caracteres.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Strength Indicator */}
              {newEmployee.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Seguridad de la contraseña</span>
                    <span className={`text-xs font-semibold ${getStrengthColor().replace('bg-', 'text-')}`}>{getStrengthLabel()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${strength}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newEmployee.confirmPassword}
                  onChange={(e) => setNewEmployee({ ...newEmployee, confirmPassword: e.target.value })}
                  className={`w-full p-3 border rounded-xl focus:ring-2 outline-none transition-colors ${
                    newEmployee.confirmPassword 
                      ? newEmployee.password === newEmployee.confirmPassword 
                        ? 'border-emerald-200 focus:ring-emerald-500 bg-emerald-50/10' 
                        : 'border-red-200 focus:ring-red-500 bg-red-50/10'
                      : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                  placeholder="Repita la contraseña"
                  required
                />
                {newEmployee.confirmPassword && newEmployee.password === newEmployee.confirmPassword && (
                  <ShieldCheck size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol Personalizado (Opcional)</label>
            <select
              value={newEmployee.customRoleId}
              onChange={(e) => setNewEmployee({ ...newEmployee, customRoleId: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Empleado Estándar</option>
              {customRoles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isCreatingEmployee}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {isCreatingEmployee ? (
              <Spinner size={20} className="text-white" />
            ) : (
              <UserPlus size={20} />
            )}
            {isCreatingEmployee ? "Creando..." : "Crear Empleado"}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Empleados Registrados</h2>
        {employees.length === 0 ? (
          <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No hay empleados registrados aún.
          </p>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                    {emp.email.replace('@parkingapp.local', '').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{emp.email.replace('@parkingapp.local', '')}</p>
                    <p className="text-xs text-slate-500">
                      Rol: {emp.custom_roles?.name || "Empleado Estándar"}
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
