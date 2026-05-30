"use client";
import DeviceManagement from "./DeviceManagement";
import { Bell } from "lucide-react";
import { motion } from "motion/react";

import styles from "./superadmin.module.css";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import {
  Building2,
  UserPlus,
  LogOut,
  PlusCircle,
  Settings,
  Image as ImageIcon,
  Car,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  BarChart3,
  Eye,
  EyeOff,
  MonitorSmartphone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sanitizeInput } from "@/lib/sanitize";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { ImageCropper } from "@/components/ui/ImageCropper";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("lots"); // lots, admins, settings
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDevicesCount, setPendingDevicesCount] = useState(0);
  const [error, setError] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [appSettings, setAppSettings] = useState({
    id: "",
    app_name: "",
    logo_url: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all"); // 'all', 'active', 'suspended'

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    id: "",
    name: "",
    isLoading: false,
  });

  // Form states
  const [newLot, setNewLot] = useState({ name: "", nit: "", address: "" });
  const [isCreatingLot, setIsCreatingLot] = useState(false);

  const [editingLot, setEditingLot] = useState<any>(null);
  const [isEditingLot, setIsEditingLot] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    username: "",
    password: "",
    parkingLotId: "",
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name, isLoading: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: "", name: "", isLoading: false });
  };

  const handleDeleteParkingLot = async () => {
    const { id, name } = deleteModal;
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/parking-lots/delete?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al eliminar el parqueadero");
      }

      setSuccess("Parqueadero eliminado exitosamente.");
      fetchParkingLots();
      fetchAdmins();
      fetchEmployees();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError("Error al eliminar parqueadero: " + err.message);
    } finally {
      closeDeleteModal();
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (
      !window.confirm(`¿Estás seguro de quitar al administrador "${email}"?`)
    ) {
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

  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

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
      .select("*, name")
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

  const fetchPendingDevicesCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("device_approvals")
        .select(`
          id,
          profiles!inner(role)
        `)
        .eq("status", "pending")
        .eq("profiles.role", "admin");

      if (error) throw error;
      setPendingDevicesCount(data ? data.length : 0);
    } catch (err: any) {
      console.error("Error fetching pending devices count:", err.message);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
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
        fetchMetrics();
        fetchPendingDevicesCount();
      }
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [
    router,
    fetchParkingLots,
    fetchAppSettings,
    fetchAdmins,
    fetchEmployees,
    fetchMetrics,
    fetchPendingDevicesCount,
  ]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen es muy grande. Máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setAppSettings({ ...appSettings, logo_url: croppedImageBase64 });
    setCropImageSrc(null);
  };


  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError("");
    setSuccess("");

    if (appSettings.id) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          app_name: appSettings.app_name,
          logo_url: appSettings.logo_url,
        })
        .eq("id", appSettings.id);

      if (error) setError("Error al guardar configuración");
      else setSuccess("Configuración guardada exitosamente");
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([
          { app_name: appSettings.app_name, logo_url: appSettings.logo_url },
        ]);

      if (error) setError("Error al guardar configuración");
      else {
        setSuccess("Configuración guardada exitosamente");
        fetchAppSettings();
      }
    }
    setSavingSettings(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleUpdateParkingLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot || isEditingLot) return;
    setIsEditingLot(true);
    setError("");
    setSuccess("");

    if (!editingLot.name || !editingLot.nit || !editingLot.address) {
      setError("Nombre, NIT y Dirección son obligatorios");
      setIsEditingLot(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const updateData = {
        name: sanitizeInput(editingLot.name),
        nit: sanitizeInput(editingLot.nit),
        address: sanitizeInput(editingLot.address),
        features: editingLot.features,
      };

      const response = await fetch("/api/parking-lots/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          parkingLotId: editingLot.id,
          updateData,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Error al actualizar el parqueadero");
      } else {
        setSuccess("Parqueadero actualizado exitosamente");
        setEditingLot(null);
        await fetchParkingLots();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err: any) {
      setError("Error de red al actualizar parqueadero: " + err.message);
    }
    setIsEditingLot(false);
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
          custom_fields: [],
          features: {
            whatsapp_receipts: false,
            monthly_subscribers: false,
            multiple_employees: false,
            reports: false,
          },
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

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const result = await createUser(
      `${sanitizeInput(newAdmin.username).toLowerCase().trim()}@parkingapp.local`,
      newAdmin.password,
      "admin",
      newAdmin.parkingLotId,
      undefined,
      token,
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

  const handleUpdateSubscription = async (
    lotId: string,
    subscriptionEnd: string | null,
    isSuspended: boolean,
  ) => {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 ">
        Cargando panel...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderTitle}>
          <ShieldCheck size={24} className="text-slate-800" />
          <span>Dueño</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("devices")}
            className="p-3 relative text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Bell size={24} />
            {pendingDevicesCount > 0 && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div className={styles.overlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderTitle}>
            <ShieldCheck size={28} className="text-slate-800" />
            <span>Panel Dueño</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("devices");
                setIsMobileMenuOpen(false);
              }}
              className="p-2 hidden md:block relative text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Bell size={24} />
              {pendingDevicesCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            <button
              className="md:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <nav className={styles.nav}>
          <button
              onClick={() => {
                setActiveTab("lots");
                setIsMobileMenuOpen(false);
              }}
              className={
                activeTab === "lots"
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
          >
            <Building2 size={20} />
            <span className="font-bold">Parqueaderos</span>
          </button>
          <button
              onClick={() => {
                setActiveTab("admins");
                setIsMobileMenuOpen(false);
              }}
              className={
                activeTab === "admins"
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
          >
            <UserPlus size={20} className="text-white" />
            <span className="font-bold">Administradores</span>
          </button>
          <button
              onClick={() => {
                setActiveTab("metrics");
                setIsMobileMenuOpen(false);
              }}
              className={
                activeTab === "metrics"
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
          >
            <BarChart3 size={20} />
            <span className="font-bold">Métricas</span>
          </button>
          <button
              onClick={() => {
                setActiveTab("devices");
                setIsMobileMenuOpen(false);
              }}
              className={
                activeTab === "devices"
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
          >
            <MonitorSmartphone size={20} />
            <span className="font-bold">Equipos</span>
          </button>
          <button
              onClick={() => {
                setActiveTab("settings");
                setIsMobileMenuOpen(false);
              }}
              className={
                activeTab === "settings"
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
          >
            <Settings size={20} />
            <span className="font-bold">Configuración</span>
          </button>
        </nav>
        <div className={styles.logoutContainer}>
          <Link
            href="/"
            onClick={() => supabase.auth.signOut()}
            className={styles.logoutButton}
          >
            <LogOut size={20} />
            <span className="font-bold">Cerrar Sesión</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3">
              <X size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && <SuccessMessage message={success} />}

          {cropImageSrc && (
            <ImageCropper
              imageSrc={cropImageSrc}
              onCropComplete={handleCropComplete}
              onCancel={() => setCropImageSrc(null)}
            />
          )}

          {activeTab === "devices" && (
            <motion.div
              key="devices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DeviceManagement />
            </motion.div>
          )}
          {/* TAB: PARQUEADEROS */}
          {activeTab === "lots" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100 ">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 text-slate-800 rounded-3xl">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 ">
                    Crear Nuevo Parqueadero
                  </h2>
                </div>

                <form
                  onSubmit={handleCreateParkingLot}
                  className="grid md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={newLot.name}
                      onChange={(e) =>
                        setNewLot({ ...newLot, name: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Parqueadero Central"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      NIT
                    </label>
                    <input
                      type="text"
                      value={newLot.nit}
                      onChange={(e) =>
                        setNewLot({ ...newLot, nit: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. 900.123.456-7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={newLot.address}
                      onChange={(e) =>
                        setNewLot({ ...newLot, address: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Calle 123 #45-67"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={isCreatingLot}
                      className="py-3 px-6 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 w-full md:w-auto min-w-[220px] shadow-md border border-slate-700 shadow-slate-200"
                    >
                      {isCreatingLot ? (
                        <Spinner size={20} className="text-white" />
                      ) : (
                        <PlusCircle size={20} className="text-white" />
                      )}
                      {isCreatingLot ? "Creando..." : "Crear Parqueadero"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100 ">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-extrabold text-slate-900 ">
                    Parqueaderos Registrados
                  </h2>
                  <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
                    <select
                      value={subscriptionFilter}
                      onChange={(e) => setSubscriptionFilter(e.target.value)}
                      className="px-5 py-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white "
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
                        className="w-full pl-4 pr-4 py-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
                {parkingLots.length === 0 ? (
                  <p className="text-slate-600 text-center py-8 bg-slate-50  rounded-3xl border border-dashed border-slate-200 ">
                    No hay parqueaderos registrados aún.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parkingLots
                      .filter((lot) =>
                        lot.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                      )
                      .filter((lot) => {
                        if (subscriptionFilter === "all") return true;
                        if (subscriptionFilter === "active")
                          return !lot.is_suspended;
                        if (subscriptionFilter === "suspended")
                          return lot.is_suspended;
                        return true;
                      })
                      .map((lot) => {
                        const lotAdmins = admins.filter(
                          (a) => a.parking_lot_id === lot.id,
                        );
                        const lotEmployees = employees.filter(
                          (e) => e.parking_lot_id === lot.id,
                        );

                        return (
                          <div
                            key={lot.id}
                            className="border border-slate-200  p-5 rounded-3xl hover:border-indigo-300 hover:shadow-md border border-slate-100 transition-all bg-slate-50  flex flex-col relative group"
                          >
                            <button
                              onClick={() =>
                                setEditingLot({
                                  ...lot,
                                  features: lot.features || {
                                    whatsapp_receipts: false,
                                    monthly_subscribers: false,
                                    multiple_employees: false,
                                    reports: false,
                                  },
                                })
                              }
                              className="absolute top-3 right-12 p-3 bg-slate-100 text-slate-800 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-100 focus:opacity-100"
                              title="Editar parqueadero"
                            >
                              <Settings size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(lot.id, lot.name)}
                              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-red-500 hover:text-white bg-red-50 hover:bg-red-500 rounded-full transition-all shadow-sm border border-red-100 hover:shadow-md active:scale-95"
                              title="Eliminar parqueadero permanentemente"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div className="flex items-start justify-between mb-3 pr-8">
                              <div>
                                <h3 className="font-bold text-lg text-slate-900 leading-tight flex flex-wrap items-center gap-3">
                                  {lot.name}
                                  {lot.is_active === undefined ||
                                  lot.is_active ? (
                                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                                      Activo
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-slate-100 text-slate-700  rounded-full border border-slate-200 ">
                                      Inactivo
                                    </span>
                                  )}
                                  {lot.is_suspended && (
                                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-100 text-red-700 rounded-full">
                                      Suspendido
                                    </span>
                                  )}
                                </h3>
                              </div>
                              <div className="p-3 bg-white  rounded-3xl border border-slate-100  shadow-md border border-slate-100 flex-shrink-0">
                                <Building2
                                  size={16}
                                  className="text-indigo-500"
                                />
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-2 font-mono bg-white  inline-block px-2 py-1 rounded border border-slate-100  w-max">
                              NIT: {lot.nit}
                            </p>
                            <p className="text-sm text-slate-600  mb-2 line-clamp-3 h-10">
                              {lot.address}
                            </p>

                            {lot.features && (
                              <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                {lot.features.whatsapp_receipts && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded">
                                    WhatsApp
                                  </span>
                                )}
                                {lot.features.monthly_subscribers && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-slate-700 rounded">
                                    Abonados
                                  </span>
                                )}
                                {lot.features.multiple_employees && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded">
                                    Empleados
                                  </span>
                                )}
                                {lot.features.reports && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded">
                                    Reportes
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-auto space-y-3">
                              <div className="pt-4 border-t border-slate-200 ">
                                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                                  Administradores ({lotAdmins.length})
                                </h4>
                                {lotAdmins.length > 0 ? (
                                  <ul className="space-y-1">
                                    {lotAdmins.map((admin) => (
                                      <li
                                        key={admin.id}
                                        className="text-sm text-slate-700  flex items-center justify-between group/admin"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                          <span className="truncate max-w-[120px]">
                                            {admin.email.replace(
                                              "@parkingapp.local",
                                              "",
                                            )}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleDeleteAdmin(
                                              admin.id,
                                              admin.email,
                                            )
                                          }
                                          className="text-red-400 hover:text-white hover:bg-red-500 rounded-full transition-all p-1 w-6 h-6 flex items-center justify-center shadow-sm border border-red-50 active:scale-95"
                                          title="Eliminar administrador"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-600 italic">
                                    Sin administradores
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 ">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                                    Empleados ({lotEmployees.length})
                                  </h4>
                                </div>
                                {lotEmployees.length > 0 ? (
                                  <ul className="space-y-1">
                                    {lotEmployees.slice(0, 3).map((emp) => (
                                      <li
                                        key={emp.id}
                                        className="text-sm text-slate-700  flex items-center gap-3"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        <span className="truncate">
                                          {emp.email.replace(
                                            "@parkingapp.local",
                                            "",
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                    {lotEmployees.length > 3 && (
                                      <li className="text-xs text-slate-600 font-bold pl-3 pt-1">
                                        +{lotEmployees.length - 3} empleados
                                        más...
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-600 italic">
                                    Sin empleados
                                  </p>
                                )}
                              </div>

                              <div className="pt-4 border-t border-slate-200  mt-4">
                                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-3">
                                  Acceso y Suspensión
                                </h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                      Fecha de Expiración
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        lot.subscription_end_date
                                          ? new Date(lot.subscription_end_date)
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const newDate = e.target.value
                                          ? new Date(
                                              e.target.value,
                                            ).toISOString()
                                          : null;
                                        handleUpdateSubscription(
                                          lot.id,
                                          newDate,
                                          lot.is_suspended || false,
                                        );
                                      }}
                                      className="w-full px-2 py-1.5 border border-slate-200  rounded-3xl outline-none text-sm bg-white  focus:border-indigo-500"
                                    />
                                  </div>

                                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200  rounded-3xl hover:bg-white  transition-colors bg-white ">
                                    <input
                                      type="checkbox"
                                      checked={lot.is_suspended || false}
                                      onChange={(e) =>
                                        handleUpdateSubscription(
                                          lot.id,
                                          lot.subscription_end_date,
                                          e.target.checked,
                                        )
                                      }
                                      className="w-4 h-4 text-red-600 rounded border-slate-300  focus:ring-red-500"
                                    />
                                    <span className="text-slate-700  font-bold text-[13px]">
                                      Bloquear Servicio (Suspendido)
                                    </span>
                                  </label>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-200  flex justify-between text-[11px] text-slate-600 font-bold mt-3">
                                <span>Capacidad: {lot.capacity}</span>
                                <span>
                                  Creado:{" "}
                                  {new Date(
                                    lot.created_at,
                                  ).toLocaleDateString()}
                                </span>
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
              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-3xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 ">
                    Crear Administrador
                  </h2>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Parqueadero Asignado
                    </label>
                    <select
                      value={newAdmin.parkingLotId}
                      onChange={(e) =>
                        setNewAdmin({
                          ...newAdmin,
                          parkingLotId: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white "
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
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Usuario
                    </label>
                    <input
                      type="text"
                      value={newAdmin.username}
                      onChange={(e) =>
                        setNewAdmin({ ...newAdmin, username: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="ej. admin1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={newAdmin.password}
                        onChange={(e) =>
                          setNewAdmin({ ...newAdmin, password: e.target.value })
                        }
                        className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none pr-12"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600  transition-colors"
                      >
                        {showAdminPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingAdmin}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 mt-2 min-w-[240px]"
                  >
                    {isCreatingAdmin ? (
                      <Spinner size={20} className="text-white" />
                    ) : (
                      <UserPlus size={20} className="text-white" />
                    )}
                    {isCreatingAdmin ? "Creando..." : "Crear Administrador"}
                  </button>
                </form>
              </div>

              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  max-w-2xl mx-auto">
                <h2 className="text-xl font-extrabold text-slate-900  mb-6">
                  Administradores Registrados
                </h2>
                {admins.length === 0 ? (
                  <p className="text-slate-600 text-center py-8 bg-slate-50  rounded-3xl border border-dashed border-slate-200 ">
                    No hay administradores registrados aún.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="p-4 border border-slate-100  rounded-3xl flex items-center justify-between hover:border-emerald-100 transition-colors bg-slate-50  group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                            {admin.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 ">
                              {admin.email.split("@")[0]}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center gap-1">
                              <Building2 size={14} />
                              {admin.parking_lots?.name ||
                                "Sin parqueadero asignado"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteAdmin(admin.id, admin.email)
                          }
                          className="w-10 h-10 flex items-center justify-center text-red-500 hover:text-white bg-red-50 hover:bg-red-500 rounded-full transition-all shadow-sm border border-red-100 hover:shadow-md active:scale-95"
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

          {/* TAB: MÉTRICAS */}
          {activeTab === "metrics" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100 ">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-3xl">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 ">
                      Métricas y Rentabilidad
                    </h2>
                    <p className="text-sm text-slate-600">
                      Consulta los ingresos registrados por arqueos de caja en
                      los últimos 30 días
                    </p>
                  </div>
                </div>

                {loadingMetrics ? (
                  <div className="flex justify-center p-8">
                    <Spinner size={32} className="text-slate-800" />
                  </div>
                ) : metrics.length === 0 ? (
                  <p className="text-center text-slate-600 italic p-8 bg-slate-50  rounded-3xl">
                    No hay registros de cierres de caja en los últimos 30 días.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 ">
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Fecha
                          </th>
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Parqueadero
                          </th>
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Monto Calculado
                          </th>
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Monto Base
                          </th>
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Total + Base
                          </th>
                          <th className="py-3 px-5 text-sm font-extrabold text-slate-600 ">
                            Cierre Por
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 ">
                            <td className="py-3 px-5 text-sm text-slate-800 ">
                              {new Date(m.closed_at).toLocaleDateString(
                                "es-CO",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-800  font-bold">
                              {m.parking_lots?.name || "Desconocido"}
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-800 ">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                              }).format(m.expected_amount || m.total_amount)}
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-600">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                              }).format(m.base_amount || 0)}
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-800  font-bold">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                              }).format(
                                (m.expected_amount || m.total_amount) +
                                  (m.base_amount || 0),
                              )}
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-600">
                              {m.closed_by || "Sistema"}
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
              <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-3xl">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 ">
                      Configuración Global
                    </h2>
                    <p className="text-sm text-slate-600">
                      Estos datos aparecerán en los recibos
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Nombre de la Aplicación / Empresa
                    </label>
                    <input
                      type="text"
                      value={appSettings.app_name}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          app_name: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Ej. NexoPark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-2">
                      Logo de la Empresa
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border-2 border-dashed border-slate-200  rounded-3xl bg-slate-50 ">
                      <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-white  border-4 border-white shadow-md border border-slate-100">
                        {appSettings.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={appSettings.logo_url}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Car size={40} className="text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 w-full">
                        <label className="cursor-pointer flex items-center justify-center gap-3 w-full py-3 px-5 bg-white  border border-slate-300  hover:bg-slate-50  text-slate-700  rounded-3xl font-bold transition-colors text-sm">
                          <ImageIcon size={18} />
                          <span>Subir Imagen</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-slate-600 mt-2 text-center sm:text-left">
                          Recomendado: Imagen cuadrada (PNG/JPG). Máx 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 min-w-[240px]"
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

      {/* Modal de Edición de Parqueadero */}
      {editingLot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white  rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 ">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-slate-800 rounded-3xl">
                  <Building2 size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 ">
                  Editar Parqueadero
                </h3>
              </div>
              <button
                onClick={() => setEditingLot(null)}
                className="text-slate-600 hover:text-slate-600  transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form
                id="edit-lot-form"
                onSubmit={handleUpdateParkingLot}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editingLot.name}
                      onChange={(e) =>
                        setEditingLot({ ...editingLot, name: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      NIT
                    </label>
                    <input
                      type="text"
                      value={editingLot.nit}
                      onChange={(e) =>
                        setEditingLot({ ...editingLot, nit: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={editingLot.address}
                      onChange={(e) =>
                        setEditingLot({
                          ...editingLot,
                          address: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 ">
                  <h4 className="font-extrabold text-slate-800  mb-4">
                    Funcionalidades (Módulos)
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl cursor-pointer hover:bg-slate-50  transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          editingLot.features?.require_device_approval || false
                        }
                        onChange={(e) =>
                          setEditingLot({
                            ...editingLot,
                            features: {
                              ...editingLot.features,
                              require_device_approval: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900  text-sm">
                          Seguridad de Equipos
                        </div>
                        <div className="text-xs text-slate-600">
                          Requiere aprobar dispositivos antes de ingresar
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl cursor-pointer hover:bg-slate-50  transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          editingLot.features?.whatsapp_receipts || false
                        }
                        onChange={(e) =>
                          setEditingLot({
                            ...editingLot,
                            features: {
                              ...editingLot.features,
                              whatsapp_receipts: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900  text-sm">
                          Recibos por WhatsApp
                        </div>
                        <div className="text-xs text-slate-600">
                          Permitir el envío de recibos por WhatsApp
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl cursor-pointer hover:bg-slate-50  transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          editingLot.features?.monthly_subscribers || false
                        }
                        onChange={(e) =>
                          setEditingLot({
                            ...editingLot,
                            features: {
                              ...editingLot.features,
                              monthly_subscribers: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900  text-sm">
                          Abonados (Mensualidades)
                        </div>
                        <div className="text-xs text-slate-600">
                          Gestión de vehículos mensuales
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl cursor-pointer hover:bg-slate-50  transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          editingLot.features?.multiple_employees || false
                        }
                        onChange={(e) =>
                          setEditingLot({
                            ...editingLot,
                            features: {
                              ...editingLot.features,
                              multiple_employees: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900  text-sm">
                          Múltiples Empleados
                        </div>
                        <div className="text-xs text-slate-600">
                          Permite roles y cuentas extra
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl cursor-pointer hover:bg-slate-50  transition-colors">
                      <input
                        type="checkbox"
                        checked={editingLot.features?.reports || false}
                        onChange={(e) =>
                          setEditingLot({
                            ...editingLot,
                            features: {
                              ...editingLot.features,
                              reports: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900  text-sm">
                          Reportes Avanzados
                        </div>
                        <div className="text-xs text-slate-600">
                          Cierres de caja y analíticas
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100  flex justify-end gap-3 bg-slate-50  rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingLot(null)}
                className="px-6 py-3.5 text-slate-600  hover:bg-slate-200 bg-slate-100 font-bold rounded-3xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-lot-form"
                disabled={isEditingLot}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold rounded-3xl transition-colors flex items-center justify-center gap-3 min-w-[200px]"
              >
                {isEditingLot && (
                  <Spinner size={16} className="text-white" />
                )}
                {isEditingLot ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Eliminar Parqueadero"
        message={`¿Estás seguro de que deseas eliminar permanentemente el parqueadero "${deleteModal.name}"? Esta acción eliminará todos los administradores, empleados, sesiones y registros asociados. No se puede deshacer.`}
        onConfirm={handleDeleteParkingLot}
        onCancel={closeDeleteModal}
        confirmText="Eliminar permanentemente"
        isLoading={deleteModal.isLoading}
      />
    </div>
  );
}
