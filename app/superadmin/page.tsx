"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import { Building2, UserPlus, LogOut, PlusCircle, Settings, Image as ImageIcon, Car, Menu, X, ShieldCheck, CheckCircle2, Trash2, BarChart3, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sanitizeInput } from "@/lib/sanitize";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("lots"); // lots, admins, settings
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [appSettings, setAppSettings] = useState({ id: "", app_name: "", logo_url: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all"); // 'all', 'active', 'suspended'

  // Form states
  const [newLot, setNewLot] = useState({ name: "", nit: "", address: "" });
  const [isCreatingLot, setIsCreatingLot] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: "",
    password: "",
    parkingLotId: "",
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleDeleteParkingLot = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el parqueadero "${name}"?\nEsta acción eliminará todos los administradores, empleados, sesiones y registros asociados. No se puede deshacer.`)) {
      return;
    }
    
    setError("");
    setSuccess("");
    try {
      const { error } = await supabase.from("parking_lots").delete().eq("id", id);
      if (error) throw error;
      
      setSuccess("Parqueadero eliminado exitosamente.");
      fetchParkingLots();
      fetchAdmins();
      fetchEmployees();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError("Error al eliminar parqueadero: " + err.message);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!window.confirm(`¿Estás seguro de quitar al administrador "${email}"?`)) {
      return;
    }

    setError("");
    setSuccess("");
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      
      setSuccess("Administrador eliminado exitosamente.");
      fetchAdmins();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError("Error al eliminar administrador: " + err.message);
    }
  };

  const fetchAppSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setAppSettings(data);
    }
  }, []);

  const [plans, setPlans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });
    
    if (data) setPlans(data);
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    // Fetch last 30 days of closures for all parking lots
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from("cash_closures")
      .select("*, parking_lots(name)")
      .gte("closed_at", thirtyDaysAgo.toISOString())
      .order("closed_at", { ascending: false });

    if (!error && data) {
      setMetrics(data);
    }
    setLoadingMetrics(false);
  }, []);

  const fetchParkingLots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parking_lots")
      .select("*, subscription_plans(name)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching parking lots:", error);
      setError("Error al cargar parqueaderos");
    } else {
      setParkingLots(data || []);
    }
    setLoading(false);
  }, []);

  const fetchAdmins = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, parking_lots(name)")
      .eq("role", "admin")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching admins:", error);
    } else {
      setAdmins(data || []);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, parking_lots(name)")
      .eq("role", "employee")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      setEmployees(data || []);
    }
  }, []);

  const [newPlan, setNewPlan] = useState({ name: "", price: 0, max_branches: 1, allow_custom_roles: true, allow_monthly_subscribers: true });
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const checkUser = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profileError || !profile || profile.role !== "superadmin") {
        router.push("/");
      } else {
        fetchParkingLots();
        fetchAppSettings();
        fetchAdmins();
        fetchEmployees();
        fetchPlans();
        fetchMetrics();
      }
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [router, fetchParkingLots, fetchAppSettings, fetchAdmins, fetchEmployees, fetchPlans, fetchMetrics]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingPlan) return;
    setIsCreatingPlan(true);
    setError("");
    setSuccess("");

    if (!newPlan.name) {
      setError("El nombre del plan es obligatorio");
      setIsCreatingPlan(false);
      return;
    }

    if (editingPlanId) {
      const { error: updateError } = await supabase
        .from("subscription_plans")
        .update(newPlan)
        .eq("id", editingPlanId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess("Plan actualizado exitosamente");
        setEditingPlanId(null);
        setNewPlan({ name: "", price: 0, max_branches: 1, allow_custom_roles: true, allow_monthly_subscribers: true });
        fetchPlans();
        setTimeout(() => setSuccess(""), 3000);
      }
    } else {
      const { error: insertError } = await supabase
        .from("subscription_plans")
        .insert([newPlan]);

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess("Plan creado exitosamente");
        setNewPlan({ name: "", price: 0, max_branches: 1, allow_custom_roles: true, allow_monthly_subscribers: true });
        fetchPlans();
        setTimeout(() => setSuccess(""), 3000);
      }
    }
    
    setIsCreatingPlan(false);
  };

  const handleEditPlanClick = (plan: any) => {
    setEditingPlanId(plan.id);
    setNewPlan({
      name: plan.name,
      price: plan.price,
      max_branches: plan.max_branches,
      allow_custom_roles: plan.allow_custom_roles,
      allow_monthly_subscribers: plan.allow_monthly_subscribers
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssignPlan = async (lotId: string, planId: string) => {
    const { error: updateError } = await supabase
      .from("parking_lots")
      .update({ plan_id: planId || null })
      .eq("id", lotId);
      
    if (updateError) setError("Error al asignar plan");
    else {
      setSuccess("Plan asignado exitosamente");
      fetchParkingLots();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  useEffect(() => {
     
    checkUser();
  }, [checkUser]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError("La imagen es muy grande. Máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppSettings({ ...appSettings, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError("");
    setSuccess("");

    if (appSettings.id) {
      const { error } = await supabase
        .from("app_settings")
        .update({ app_name: appSettings.app_name, logo_url: appSettings.logo_url })
        .eq("id", appSettings.id);
      
      if (error) setError("Error al guardar configuración");
      else setSuccess("Configuración guardada exitosamente");
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([{ app_name: appSettings.app_name, logo_url: appSettings.logo_url }]);
      
      if (error) setError("Error al guardar configuración");
      else {
        setSuccess("Configuración guardada exitosamente");
        fetchAppSettings();
      }
    }
    setSavingSettings(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleCreateParkingLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingLot) return;
    setIsCreatingLot(true);
    setError("");
    setSuccess("");

    if (!newLot.name || !newLot.nit || !newLot.address) {
      setError("Todos los campos del parqueadero son obligatorios");
      setIsCreatingLot(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("parking_lots")
      .insert([
        {
          name: sanitizeInput(newLot.name),
          nit: sanitizeInput(newLot.nit),
          address: sanitizeInput(newLot.address),
          allowed_vehicles: ["motos", "carros", "bicicletas"],
          capacity: 100,
          show_revenue: false,
          custom_fields: []
        },
      ])
      .select();

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Parqueadero creado exitosamente");
      setNewLot({ name: "", nit: "", address: "" });
      await fetchParkingLots();
      setActiveTab("lots");
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsCreatingLot(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingAdmin) return;
    setIsCreatingAdmin(true);
    setError("");
    setSuccess("");

    if (!newAdmin.username || !newAdmin.password || !newAdmin.parkingLotId) {
      setError("Todos los campos del administrador son obligatorios");
      setIsCreatingAdmin(false);
      return;
    }

    const result = await createUser(
      `${sanitizeInput(newAdmin.username).toLowerCase().trim()}@parkingapp.local`,
      newAdmin.password,
      "admin",
      newAdmin.parkingLotId,
    );

    if (!result.success) {
      setError(result.error || "Error al crear administrador");
    } else {
      setSuccess("Administrador creado exitosamente");
      setNewAdmin({ username: "", password: "", parkingLotId: "" });
      fetchAdmins();
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsCreatingAdmin(false);
  };

  const handleUpdateSubscription = async (lotId: string, subscriptionEnd: string | null, isSuspended: boolean) => {
    setError("");
    setSuccess("");
    const { error: updateError } = await supabase
      .from("parking_lots")
      .update({
        subscription_end_date: subscriptionEnd,
        is_suspended: isSuspended,
      })
      .eq("id", lotId);
      
    if (updateError) {
      setError("Error al actualizar la suscripción: " + updateError.message);
    } else {
      setSuccess("Suscripción actualizada exitosamente");
      fetchParkingLots();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ShieldCheck size={24} className="text-indigo-400" />
          <span>Dueño</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 left-0 z-50 transition-transform duration-300 w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-screen`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3 font-bold text-xl text-white">
            <ShieldCheck size={28} className="text-indigo-400" />
            <span>Panel Dueño</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab("lots"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "lots" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Building2 size={20} />
            <span className="font-medium">Parqueaderos</span>
          </button>
          <button
            onClick={() => { setActiveTab("admins"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "admins" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <UserPlus size={20} />
            <span className="font-medium">Administradores</span>
          </button>
          <button
            onClick={() => { setActiveTab("plans"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "plans" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <ShieldCheck size={20} />
            <span className="font-medium">Planes</span>
          </button>
          <button
            onClick={() => { setActiveTab("metrics"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "metrics" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <BarChart3 size={20} />
            <span className="font-medium">Métricas</span>
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

          {success && <SuccessMessage message={success} />}

          {/* TAB: PARQUEADEROS */}
          {activeTab === "lots" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Crear Nuevo Parqueadero</h2>
                </div>

                <form onSubmit={handleCreateParkingLot} className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={newLot.name}
                      onChange={(e) => setNewLot({ ...newLot, name: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Parqueadero Central"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
                    <input
                      type="text"
                      value={newLot.nit}
                      onChange={(e) => setNewLot({ ...newLot, nit: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. 900.123.456-7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                    <input
                      type="text"
                      value={newLot.address}
                      onChange={(e) => setNewLot({ ...newLot, address: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Calle 123 #45-67"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={isCreatingLot}
                      className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 w-full md:w-auto shadow-md shadow-indigo-200"
                    >
                      {isCreatingLot ? (
                        <Spinner size={20} className="text-white" />
                      ) : (
                        <PlusCircle size={20} />
                      )}
                      {isCreatingLot ? "Creando..." : "Crear Parqueadero"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Parqueaderos Registrados</h2>
                  <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
                    <select
                      value={subscriptionFilter}
                      onChange={(e) => setSubscriptionFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    >
                      <option value="all">Todas las suscripciones</option>
                      <option value="active">Activas</option>
                      <option value="suspended">Suspendidas</option>
                    </select>
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Buscar parqueadero..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
                {parkingLots.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay parqueaderos registrados aún.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parkingLots
                      .filter(lot => lot.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .filter(lot => {
                        if (subscriptionFilter === "all") return true;
                        if (subscriptionFilter === "active") return !lot.is_suspended;
                        if (subscriptionFilter === "suspended") return lot.is_suspended;
                        return true;
                      })
                      .map((lot) => {
                      const lotAdmins = admins.filter(a => a.parking_lot_id === lot.id);
                      const lotEmployees = employees.filter(e => e.parking_lot_id === lot.id);
                      
                      return (
                        <div key={lot.id} className="border border-slate-200 p-5 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all bg-slate-50/50 flex flex-col relative group">
                          <button
                            onClick={() => handleDeleteParkingLot(lot.id, lot.name)}
                            className="absolute top-3 right-3 p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 focus:opacity-100"
                            title="Eliminar parqueadero permanentemente"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="flex items-start justify-between mb-3 pr-8">
                            <div>
                              <h3 className="font-bold text-lg text-slate-800 leading-tight flex items-center gap-2">
                                {lot.name}
                                {lot.is_suspended ? (
                                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-100 text-red-700 rounded-full">Suspendido</span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 rounded-full">Activo</span>
                                )}
                              </h3>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm flex-shrink-0">
                              <Building2 size={16} className="text-indigo-500" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 mb-2 font-mono bg-white inline-block px-2 py-1 rounded border border-slate-100 w-max">NIT: {lot.nit}</p>
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2 h-10">{lot.address}</p>
                          
                          <div className="mt-auto space-y-3">
                            <div className="pt-4 border-t border-slate-200">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administradores ({lotAdmins.length})</h4>
                              {lotAdmins.length > 0 ? (
                                <ul className="space-y-1">
                                  {lotAdmins.map(admin => (
                                    <li key={admin.id} className="text-sm text-slate-700 flex items-center justify-between group/admin">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="truncate max-w-[120px]">{admin.email.replace('@parkingapp.local', '')}</span>
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                        className="text-red-400 opacity-0 group-hover/admin:opacity-100 hover:text-red-600 transition-opacity p-1"
                                        title="Eliminar administrador"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin administradores</p>
                              )}
                            </div>
                            
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Empleados ({lotEmployees.length})</h4>
                              </div>
                              {lotEmployees.length > 0 ? (
                                <ul className="space-y-1">
                                  {lotEmployees.slice(0, 3).map(emp => (
                                    <li key={emp.id} className="text-sm text-slate-700 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      <span className="truncate">{emp.email.replace('@parkingapp.local', '')}</span>
                                    </li>
                                  ))}
                                  {lotEmployees.length > 3 && (
                                    <li className="text-xs text-slate-500 font-medium pl-3 pt-1">
                                      +{lotEmployees.length - 3} empleados más...
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin empleados</p>
                              )}
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 mt-4">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Suscripción y Acceso</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Plan de Suscripción</label>
                                  <select
                                    value={lot.plan_id || ""}
                                    onChange={(e) => handleAssignPlan(lot.id, e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none text-sm bg-white focus:border-indigo-500"
                                  >
                                    <option value="">Sin plan asignado</option>
                                    {plans.map(plan => (
                                      <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Fecha de Expiración</label>
                                  <input
                                    type="date"
                                    value={lot.subscription_end_date ? new Date(lot.subscription_end_date).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                      const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                      handleUpdateSubscription(lot.id, newDate, lot.is_suspended || false);
                                    }}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none text-sm bg-white focus:border-indigo-500"
                                  />
                                </div>
                                
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors bg-white/50">
                                  <input
                                    type="checkbox"
                                    checked={lot.is_suspended || false}
                                    onChange={(e) => handleUpdateSubscription(lot.id, lot.subscription_end_date, e.target.checked)}
                                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                  />
                                  <span className="text-slate-700 font-medium text-[13px]">Bloquear Servicio (Suspendido)</span>
                                </label>
                              </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-400 font-medium mt-3">
                              <span>Capacidad: {lot.capacity}</span>
                              <span>Creado: {new Date(lot.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ADMINISTRADORES */}
          {activeTab === "admins" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Crear Administrador</h2>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parqueadero Asignado</label>
                    <select
                      value={newAdmin.parkingLotId}
                      onChange={(e) => setNewAdmin({ ...newAdmin, parkingLotId: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="">Seleccione un parqueadero</option>
                      {parkingLots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.name} - {lot.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                    <input
                      type="text"
                      value={newAdmin.username}
                      onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="ej. admin1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-12"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingAdmin}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {isCreatingAdmin ? (
                      <Spinner size={20} className="text-white" />
                    ) : (
                      <UserPlus size={20} />
                    )}
                    {isCreatingAdmin ? "Creando..." : "Crear Administrador"}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Administradores Registrados</h2>
                {admins.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay administradores registrados aún.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {admins.map((admin) => (
                      <div key={admin.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:border-emerald-100 transition-colors bg-slate-50/50 group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                            {admin.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{admin.email.split('@')[0]}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Building2 size={14} />
                              {admin.parking_lots?.name || "Sin parqueadero asignado"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                          className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                          title="Eliminar administrador"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PLANES */}
          {activeTab === "plans" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{editingPlanId ? "Editar Plan de Suscripción" : "Crear Plan de Suscripción"}</h2>
                </div>

                <form onSubmit={handleCreatePlan} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                      placeholder="Ej. Plan Pro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Mensual ($)</label>
                    <input
                      type="number"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Sucursales</label>
                    <input
                      type="number"
                      value={newPlan.max_branches}
                      onChange={(e) => setNewPlan({ ...newPlan, max_branches: Number(e.target.value) })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2 justify-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={newPlan.allow_custom_roles}
                        onChange={(e) => setNewPlan({ ...newPlan, allow_custom_roles: e.target.checked })}
                        className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                      />
                      <span className="text-slate-700 font-medium text-xs">Roles Personalizados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={newPlan.allow_monthly_subscribers}
                        onChange={(e) => setNewPlan({ ...newPlan, allow_monthly_subscribers: e.target.checked })}
                        className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                      />
                      <span className="text-slate-700 font-medium text-xs">Abonados Mensuales</span>
                    </label>
                  </div>
                  
                  <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                    {editingPlanId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanId(null);
                          setNewPlan({ name: "", price: 0, max_branches: 1, allow_custom_roles: true, allow_monthly_subscribers: true });
                        }}
                        className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isCreatingPlan}
                      className="py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 w-full md:w-auto shadow-md shadow-violet-200"
                    >
                      {isCreatingPlan ? (
                        <Spinner size={20} className="text-white" />
                      ) : (
                        <PlusCircle size={20} />
                      )}
                      {isCreatingPlan ? "Guardando..." : (editingPlanId ? "Actualizar Plan" : "Crear Plan")}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Planes Disponibles</h2>
                {plans.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay planes registrados aún. Ejecuta el script SQL global para los planes predefinidos.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div key={plan.id} className="border border-slate-200 p-5 rounded-xl flex flex-col bg-slate-50/50 relative group">
                        <button
                          onClick={() => handleEditPlanClick(plan)}
                          className="absolute top-3 right-3 p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 hover:text-violet-600 focus:opacity-100"
                          title="Editar Plan"
                        >
                          <Settings size={16} />
                        </button>
                        <h3 className="font-bold text-lg text-slate-800 mb-1 pr-6">{plan.name}</h3>
                        <p className="text-2xl font-black text-violet-600 mb-4">
                          {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(plan.price)}
                          <span className="text-xs text-slate-500 font-normal">/mes</span>
                        </p>
                        <div className="space-y-2 mt-auto text-sm text-slate-600">
                          <p className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Max. Sucursales</span>
                            <span className="font-bold">{plan.max_branches}</span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Roles Pers.</span>
                            <span>{plan.allow_custom_roles ? "✅" : "❌"}</span>
                          </p>
                          <p className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Abonados</span>
                            <span>{plan.allow_monthly_subscribers ? "✅" : "❌"}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MÉTRICAS */}
          {activeTab === "metrics" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Métricas y Rentabilidad</h2>
                    <p className="text-sm text-slate-500">Consulta los ingresos registrados por arqueos de caja en los últimos 30 días</p>
                  </div>
                </div>

                {loadingMetrics ? (
                  <div className="flex justify-center p-8">
                    <Spinner size={32} className="text-indigo-600" />
                  </div>
                ) : metrics.length === 0 ? (
                  <p className="text-center text-slate-500 italic p-8 bg-slate-50 rounded-xl">No hay registros de cierres de caja en los últimos 30 días.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Fecha</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Parqueadero</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Monto Calculado</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Monto Base</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Total + Base</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-600">Cierre Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-800">
                              {new Date(m.closed_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                              {m.parking_lots?.name || 'Desconocido'}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-800">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(m.expected_amount || m.total_amount)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(m.base_amount || 0)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format((m.expected_amount || m.total_amount) + (m.base_amount || 0))}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">
                              {m.closed_by || 'Sistema'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CONFIGURACIÓN */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Configuración Global</h2>
                    <p className="text-sm text-slate-500">Estos datos aparecerán en los recibos</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Aplicación / Empresa</label>
                    <input
                      type="text"
                      value={appSettings.app_name}
                      onChange={(e) => setAppSettings({ ...appSettings, app_name: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Ej. NexoPark"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo de la Empresa</label>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      
                      <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-white border-4 border-white shadow-md">
                        {appSettings.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={appSettings.logo_url} alt="Logo preview" className="w-full h-full object-cover" />
                        ) : (
                          <Car size={40} className="text-slate-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 w-full">
                        <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors text-sm">
                          <ImageIcon size={18} />
                          <span>Subir Imagen</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                        </label>
                        <p className="text-xs text-slate-500 mt-2 text-center sm:text-left">
                          Recomendado: Imagen cuadrada (PNG/JPG). Máx 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {savingSettings ? (
                      <Spinner size={20} className="text-white" />
                    ) : (
                      <Settings size={20} />
                    )}
                    {savingSettings ? "Guardando..." : "Guardar Configuración"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
