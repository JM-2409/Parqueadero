"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import { Building2, UserPlus, LogOut, PlusCircle, Settings, Image as ImageIcon, Car, Menu, X, ShieldCheck, CheckCircle2 } from "lucide-react";
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

  // Form states
  const [newLot, setNewLot] = useState({ name: "", nit: "", address: "" });
  const [isCreatingLot, setIsCreatingLot] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: "",
    password: "",
    parkingLotId: "",
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

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

  const fetchParkingLots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parking_lots")
      .select("*")
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
      }
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [router, fetchParkingLots, fetchAppSettings, fetchAdmins, fetchEmployees]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ShieldCheck size={24} className="text-indigo-400" />
          <span>Dueño</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:min-h-screen sticky top-0 z-10`}>
        <div className="p-6 hidden md:flex items-center gap-3 font-bold text-xl text-white border-b border-slate-800">
          <ShieldCheck size={28} className="text-indigo-400" />
          <span>Panel Dueño</span>
        </div>
        <nav className="p-4 space-y-2 flex-1">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Parqueaderos Registrados</h2>
                  <div className="relative w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Buscar parqueadero..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-4 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-full sm:w-64"
                    />
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
                      .map((lot) => {
                      const lotAdmins = admins.filter(a => a.parking_lot_id === lot.id);
                      const lotEmployees = employees.filter(e => e.parking_lot_id === lot.id);
                      
                      return (
                        <div key={lot.id} className="border border-slate-200 p-5 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all bg-slate-50/50 flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{lot.name}</h3>
                            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                              <Building2 size={16} className="text-indigo-500" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 mb-2 font-mono bg-white inline-block px-2 py-1 rounded border border-slate-100">NIT: {lot.nit}</p>
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{lot.address}</p>
                          
                          <div className="mt-auto space-y-3">
                            <div className="pt-4 border-t border-slate-200">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administradores</h4>
                              {lotAdmins.length > 0 ? (
                                <ul className="space-y-1">
                                  {lotAdmins.map(admin => (
                                    <li key={admin.id} className="text-sm text-slate-700 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      {admin.email.replace('@parkingapp.local', '')}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin administradores</p>
                              )}
                            </div>
                            
                            <div className="pt-3 border-t border-slate-100">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Empleados</h4>
                              {lotEmployees.length > 0 ? (
                                <ul className="space-y-1">
                                  {lotEmployees.map(emp => (
                                    <li key={emp.id} className="text-sm text-slate-700 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      {emp.email.replace('@parkingapp.local', '')}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin empleados</p>
                              )}
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-500 font-medium">
                              <span>Capacidad: {lot.capacity}</span>
                              <span>{new Date(lot.created_at).toLocaleDateString()}</span>
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
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Mínimo 6 caracteres"
                    />
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
                      <div key={admin.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:border-emerald-100 transition-colors bg-slate-50/50">
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
