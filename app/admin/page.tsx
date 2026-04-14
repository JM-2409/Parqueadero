"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import { UserPlus, LogOut, Settings, Users, DollarSign, LayoutDashboard, Menu, X, Plus, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TariffSettings from "./TariffSettings";
import AdminHistory from "./AdminHistory";
import ManualEntry from "./ManualEntry";
import { FileEdit } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, settings, tariffs, employees
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Settings states
  const [capacity, setCapacity] = useState("");
  const [showRevenue, setShowRevenue] = useState(false);
  const [allowedVehicles, setAllowedVehicles] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<{name: string, required: boolean}[]>([]);

  // Employee creation states
  const [newEmployee, setNewEmployee] = useState({ username: "", password: "" });
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const vehicleTypes = ["motos", "carros", "bicicletas", "camionetas", "camiones"];

  const fetchParkingLot = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("parking_lots")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setParkingLot(data);
      setCapacity(data.capacity?.toString() || "");
      setShowRevenue(data.show_revenue || false);
      setAllowedVehicles(data.allowed_vehicles || []);
      setCustomFields(data.custom_fields || []);
    }
  }, []);

  const fetchEmployees = useCallback(async (parkingLotId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .eq("role", "employee");
    if (data) {
      setEmployees(data);
    }
    setLoading(false);
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.push("/");
        return;
      }

      fetchParkingLot(profile.parking_lot_id);
      fetchEmployees(profile.parking_lot_id);
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [router, fetchParkingLot, fetchEmployees]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkUser();
  }, [checkUser]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingSettings) return;
    setIsUpdatingSettings(true);
    setError("");
    setSuccess("");

    if (!parkingLot) {
      setIsUpdatingSettings(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("parking_lots")
      .update({
        capacity: parseInt(capacity),
        show_revenue: showRevenue,
        allowed_vehicles: allowedVehicles,
        custom_fields: customFields
      })
      .eq("id", parkingLot.id);

    if (updateError) {
      setError("Error al actualizar configuración");
    } else {
      setSuccess("Configuración actualizada exitosamente");
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsUpdatingSettings(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingEmployee) return;
    setIsCreatingEmployee(true);
    setError("");
    setSuccess("");

    if (!newEmployee.username || !newEmployee.password) {
      setError("Todos los campos son obligatorios");
      setIsCreatingEmployee(false);
      return;
    }

    const result = await createUser(
      `${newEmployee.username.toLowerCase().trim()}@parkingapp.local`,
      newEmployee.password,
      "employee",
      parkingLot.id
    );

    if (!result.success) {
      setError(result.error || "Error al crear empleado");
    } else {
      setSuccess("Empleado creado exitosamente");
      setNewEmployee({ username: "", password: "" });
      await fetchEmployees(parkingLot.id);
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsCreatingEmployee(false);
  };

  const toggleVehicleType = (type: string) => {
    if (allowedVehicles.includes(type)) {
      setAllowedVehicles(allowedVehicles.filter((v) => v !== type));
    } else {
      setAllowedVehicles([...allowedVehicles, type]);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: "", required: false }]);
  };

  const updateCustomField = (index: number, key: 'name' | 'required', value: any) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setCustomFields(newFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Settings size={24} className="text-indigo-400" />
          <span>Administración</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:min-h-screen sticky top-0 z-10`}>
        <div className="p-6 hidden md:flex items-center gap-3 font-bold text-xl text-white border-b border-slate-800">
          <Settings size={28} className="text-indigo-400" />
          <span>Panel Admin</span>
        </div>
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Parqueadero</p>
          <p className="text-white font-medium truncate">{parkingLot?.name}</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "dashboard" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Historial</span>
          </button>
          <button
            onClick={() => { setActiveTab("manual_entry"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "manual_entry" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <FileEdit size={20} />
            <span className="font-medium">Ingreso Manual</span>
          </button>
          <button
            onClick={() => { setActiveTab("tariffs"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "tariffs" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <DollarSign size={20} />
            <span className="font-medium">Tarifas</span>
          </button>
          <button
            onClick={() => { setActiveTab("employees"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "employees" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Users size={20} />
            <span className="font-medium">Empleados</span>
          </button>
          <button
            onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "settings" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Settings size={20} />
            <span className="font-medium">Configuración</span>
          </button>
        </nav>
        <div className="p-4 mt-auto border-t border-slate-800">
          <Link
            href="/"
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <X size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* TAB: DASHBOARD / HISTORIAL */}
          {activeTab === "dashboard" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AdminHistory parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* TAB: INGRESO MANUAL */}
          {activeTab === "manual_entry" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ManualEntry 
                parkingLotId={parkingLot.id} 
                allowedVehicles={allowedVehicles} 
                customFields={customFields} 
              />
            </div>
          )}

          {/* TAB: TARIFAS */}
          {activeTab === "tariffs" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TariffSettings parkingLotId={parkingLot.id} allowedVehicles={allowedVehicles} />
            </div>
          )}

          {/* TAB: EMPLEADOS */}
          {activeTab === "employees" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ej. empleado1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <input
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingEmployee}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {isCreatingEmployee ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                            <p className="text-xs text-slate-500">Rol: Empleado</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CONFIGURACIÓN */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Configuración del Parqueadero</h2>
                    <p className="text-sm text-slate-500">Ajustes generales y campos personalizados</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Capacidad Total</label>
                      <input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none"
                        placeholder="Ej. 100"
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Opciones de Visibilidad</label>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={showRevenue}
                          onChange={(e) => setShowRevenue(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 font-medium">Mostrar recaudo a empleados</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Tipos de Vehículos Permitidos</label>
                    <div className="flex flex-wrap gap-3">
                      {vehicleTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleVehicleType(type)}
                          className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors border ${
                            allowedVehicles.includes(type)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Campos Personalizados</h3>
                        <p className="text-sm text-slate-500">Datos extra a pedir al ingresar un vehículo (Ej. Casco, Teléfono)</p>
                      </div>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Añadir Campo
                      </button>
                    </div>

                    {customFields.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
                        No hay campos personalizados configurados.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customFields.map((field, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateCustomField(idx, 'name', e.target.value)}
                              placeholder="Nombre del campo (Ej. Casco)"
                              className="flex-1 w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              required
                            />
                            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateCustomField(idx, 'required', e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                Obligatorio
                              </label>
                              <button
                                type="button"
                                onClick={() => removeCustomField(idx)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar campo"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isUpdatingSettings}
                      className="w-full md:w-auto py-3 px-8 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isUpdatingSettings ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Settings size={20} />
                      )}
                      {isUpdatingSettings ? "Guardando..." : "Guardar Configuración"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
