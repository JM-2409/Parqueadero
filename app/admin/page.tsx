"use client";
import AdminDeviceManagement from "./DeviceManagement";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import styles from "./admin.module.css";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/app/actions/auth";
import {
  UserPlus,
  LogOut,
  Settings,
  Users,
  DollarSign,
  LayoutDashboard,
  Menu,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Home,
  Car,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TariffSettings from "./TariffSettings";
import AdminHistory from "./AdminHistory";
import CashClosuresHistory from "./CashClosuresHistory";
import ManualEntry from "./ManualEntry";
import CustomRoles from "./CustomRoles";
import PrivateParking from "./PrivateParking";
import Blacklist from "./Blacklist";
import MonthlySubscribers from "./MonthlySubscribers";
import EmployeeManagement from "./EmployeeManagement";
import EmployeeLogs from "./EmployeeLogs";
import { FileEdit, Shield, Activity } from "lucide-react";
import { sanitizeInput } from "@/lib/sanitize";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
} from "recharts";

import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, settings, tariffs, employees
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pendingDevicesCount, setPendingDevicesCount] = useState(0);
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ vehicles: 0, revenue: 0 });
  const [employees, setEmployees] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Settings states
  const [capacity, setCapacity] = useState("");
  const [showRevenue, setShowRevenue] = useState(false);
  const [allowedVehicles, setAllowedVehicles] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<
    { name: string; required: boolean }[]
  >([]);
  const [privateCustomFields, setPrivateCustomFields] = useState<
    { name: string; required: boolean; visible: boolean }[]
  >([]);
  const [parkingSettings, setParkingSettings] = useState<{
    autoPrint: boolean;
    confirmEntry: boolean;
    showNotes: boolean;
    requirePhoto?: boolean;
    auto_send_whatsapp?: boolean;
  }>({
    autoPrint: false,
    confirmEntry: true,
    showNotes: false,
    requirePhoto: false,
    auto_send_whatsapp: false,
  });
  const [showSqlAlert, setShowSqlAlert] = useState(false);

  // Employee creation states
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    password: "",
    customRoleId: "",
  });
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const vehicleTypes = [
    "motos",
    "carros",
    "bicicletas",
    "camionetas",
    "camiones",
  ];

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
      setPrivateCustomFields(data.private_custom_fields || []);
      setParkingSettings(
        data.settings || {
          autoPrint: false,
          confirmEntry: true,
          showNotes: false,
        },
      );
    }
  }, []);

  const [currentShiftRevenue, setCurrentShiftRevenue] = useState(0);
  const [isClosingRegister, setIsClosingRegister] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<
    { date: string; amount: number }[]
  >([]);

  const [statPeriod, setStatPeriod] = useState<"7days" | "30days">("7days");

  // Need to extract fetch stats logic to make it respect period without refetching employees
  const fetchStats = useCallback(
    async (parkingLotId: string, period: "7days" | "30days") => {
      let periodDays = period === "7days" ? 7 : 30;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - periodDays);
      const { data: periodData } = await supabase
        .from("parking_sessions")
        .select("exit_time, total_charged")
        .eq("parking_lot_id", parkingLotId)
        .not("exit_time", "is", null)
        .gte("exit_time", pastDate.toISOString());

      if (periodData) {
        const dailyMap: Record<string, number> = {};
        periodData.forEach((s) => {
          const dateStr = new Date(s.exit_time).toLocaleDateString();
          dailyMap[dateStr] =
            (dailyMap[dateStr] || 0) + (Number(s.total_charged) || 0);
        });
        const statsArray = Object.keys(dailyMap).map((date) => ({
          date,
          amount: dailyMap[date],
        }));
        setWeeklyStats(statsArray);
      }
    },
    [],
  );

  const fetchTodayStats = useCallback(async (parkingLotId: string) => {
    // Fetch last closure
    const { data: lastClosure } = await supabase
      .from("cash_closures")
      .select("closed_at")
      .eq("parking_lot_id", parkingLotId)
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastClosureTime = lastClosure ? lastClosure.closed_at : null;

    // Fetch stats for current shift (since last closure)
    let query = supabase
      .from("parking_sessions")
      .select("total_charged")
      .eq("parking_lot_id", parkingLotId)
      .not("exit_time", "is", null);

    if (lastClosureTime) {
      query = query.gt("exit_time", lastClosureTime);
    }

    // Fetch today stats for total vehicles (all day, irrespective of closure)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayVehiclesData } = await supabase
      .from("parking_sessions")
      .select("id")
      .eq("parking_lot_id", parkingLotId)
      .gte("entry_time", today.toISOString());

    // Fetch accumulated revenue for shift
    const { data: shiftData } = await query;

    if (shiftData) {
      const revenue = shiftData.reduce(
        (sum, s) => sum + (Number(s.total_charged) || 0),
        0,
      );
      setCurrentShiftRevenue(revenue);
      setTodayStats((prev) => ({
        ...prev,
        vehicles: todayVehiclesData?.length || 0,
        revenue,
      }));
    }
  }, []);

  const fetchEmployees = useCallback(
    async (parkingLotId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, parking_lot_id, created_at")
        .eq("parking_lot_id", parkingLotId)
        .eq("role", "employee");
      if (data) {
        setEmployees(data);
      }

      await fetchTodayStats(parkingLotId);
      await fetchStats(parkingLotId, statPeriod);

      setLoading(false);
    },
    [fetchStats, statPeriod, fetchTodayStats],
  );

  const handleCloseRegister = async () => {
    if (
      !confirm(
        "¿Está seguro que desea cerrar la caja? El recaudo volverá a $0.",
      )
    )
      return;
    setIsClosingRegister(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Fetch last closure to determine opened_at
      const { data: lastClosure } = await supabase
        .from("cash_closures")
        .select("closed_at")
        .eq("parking_lot_id", parkingLot.id)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const opened_at = lastClosure
        ? lastClosure.closed_at
        : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const { error } = await supabase.from("cash_closures").insert([
        {
          parking_lot_id: parkingLot.id,
          total_revenue: currentShiftRevenue,
          closed_by: session?.user?.id,
          opened_at: opened_at,
          notes: `Cierre de caja - Admin`,
        },
      ]);

      if (error) throw error;

      setSuccess("Caja cerrada exitosamente.");
      setTimeout(() => setSuccess(""), 3000);

      // Reload stats
      fetchEmployees(parkingLot.id);
    } catch (err: any) {
      console.error("Error cerrado caja", err);
      setError("No se pudo cerrar la caja: " + err.message);
    } finally {
      setIsClosingRegister(false);
    }
  };

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      let profile = null;
      let profileError = null;

      const { data: profileWithLots, error: errWithLots } = await supabase
        .from("profiles")
        .select("*, parking_lots(*, subscription_plans(*))")
        .eq("id", session.user.id)
        .single();

      if (
        errWithLots &&
        (errWithLots.message.includes("is_suspended") ||
          errWithLots.message.includes("subscription_end_date"))
      ) {
        // Fallback selection picking only fields that exist originally
        const { data: fallbackProfile, error: errFallback } = await supabase
          .from("profiles")
          .select(
            "*, parking_lots(id, name, nit, address, capacity, allowed_vehicles, show_revenue, created_at)",
          )
          .eq("id", session.user.id)
          .single();

        profile = fallbackProfile;
        profileError = errFallback;
      } else {
        profile = profileWithLots;
        profileError = errWithLots;
      }

      if (profileError || profile?.role !== "admin") {
        router.push("/");
        return;
      }

      if (profile.parking_lots && profile.parking_lots.is_suspended) {
        await supabase.auth.signOut();
        router.push("/login?error=suspended");
        return;
      }

      const subEnd = profile.parking_lots?.subscription_end_date;
      if (subEnd && new Date(subEnd) < new Date()) {
        await supabase.auth.signOut();
        router.push("/login?error=expired");
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
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (!parkingLot?.id) return;

    const channel = supabase
      .channel("public:parking_sessions:admin_dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_sessions",
          filter: `parking_lot_id=eq.${parkingLot.id}`,
        },
        () => {
          fetchTodayStats(parkingLot.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parkingLot?.id, fetchTodayStats]);

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

    const updateData = {
      capacity: parseInt(capacity),
      show_revenue: showRevenue,
      allowed_vehicles: allowedVehicles,
      custom_fields: customFields,
      private_custom_fields: privateCustomFields,
      settings: parkingSettings,
      entry_grace_period_mins: parkingLot?.entry_grace_period_mins ?? 0,
      shift_grace_period_mins: parkingLot?.shift_grace_period_mins ?? 15,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/parking-lots/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          parkingLotId: parkingLot.id,
          updateData,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (
          result.error?.includes("settings") &&
          result.error?.includes("does not exist")
        ) {
          setShowSqlAlert(true);
          setError(
            "Falta una configuración en la base de datos para guardar estas preferencias.",
          );
        } else {
          setError(result.error || "Error al actualizar configuración");
        }
      } else {
        setSuccess("Configuración actualizada exitosamente");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err: any) {
      setError("Error de red al actualizar configuración: " + err.message);
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

    const sanitizedUsername = sanitizeInput(
      newEmployee.username.toLowerCase().trim(),
    );
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const result = await createUser(
      `${sanitizedUsername}@parkingapp.local`,
      newEmployee.password,
      "employee",
      parkingLot.id,
      newEmployee.customRoleId || undefined,
      token,
    );

    if (!result.success) {
      setError(result.error || "Error al crear usuario");
    } else {
      setSuccess("Usuario creado exitosamente");
      setNewEmployee({ username: "", password: "", customRoleId: "" });
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

  const updateCustomField = (
    index: number,
    key: "name" | "required",
    value: any,
  ) => {
    const newFields = [...customFields];
    if (key === "name" && typeof value === "string") {
      newFields[index] = { ...newFields[index], [key]: sanitizeInput(value) };
    } else {
      newFields[index] = { ...newFields[index], [key]: value };
    }
    setCustomFields(newFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const addPrivateCustomField = () => {
    setPrivateCustomFields([
      ...privateCustomFields,
      { name: "", required: false, visible: true },
    ]);
  };

  const updatePrivateCustomField = (
    index: number,
    key: "name" | "required" | "visible",
    value: any,
  ) => {
    const newFields = [...privateCustomFields];
    if (key === "name" && typeof value === "string") {
      newFields[index] = { ...newFields[index], [key]: sanitizeInput(value) };
    } else {
      newFields[index] = { ...newFields[index], [key]: value };
    }
    setPrivateCustomFields(newFields);
  };

  const removePrivateCustomField = (index: number) => {
    setPrivateCustomFields(privateCustomFields.filter((_, i) => i !== index));
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 ">
        Cargando panel...
      </div>
    );

  return (
    <div className={styles.container}>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderTitle}>
          <Settings size={24} className="text-slate-800" />
          <span className="truncate">Panel Admin</span>
        </div>
        <div className="flex items-center gap-3">
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
        <div
          className={styles.overlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderTitle}>
            <Settings size={28} className="text-slate-800" />
            <span>Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-400 hover:text-slate-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <div className={styles.sidebarLotInfo}>
          <p className={styles.sidebarLotLabel}>
            Parqueadero
          </p>
          <p className={styles.sidebarLotName}>
            {parkingLot?.name}
          </p>
        </div>
        <nav className={styles.nav}>
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Resumen
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("cash_closures");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "cash_closures" ? styles.navItemActive : ""}`}
          >
            <DollarSign size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Historial de Cajas
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("manual_entry");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "manual_entry" ? styles.navItemActive : ""}`}
          >
            <FileEdit size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Ingreso Manual
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("tariffs");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "tariffs" ? styles.navItemActive : ""}`}
          >
            <DollarSign size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Tarifas
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("employees");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "employees" ? styles.navItemActive : ""}`}
          >
            <Users size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Operarios
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("employee_logs");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "employee_logs" ? styles.navItemActive : ""}`}
          >
            <Activity size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Registro Turnos
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("private_parking");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "private_parking" ? styles.navItemActive : ""}`}
          >
            <Home size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Privados
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("subscribers");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "subscribers" ? styles.navItemActive : ""}`}
          >
            <Users size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Abonados
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("blacklist");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "blacklist" ? styles.navItemActive : ""}`}
          >
            <Shield size={20} className="text-red-400" />
            <span className="font-bold whitespace-nowrap text-left">
              Lista Negra
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
          >
            <Settings size={20} />
            <span className="font-bold whitespace-nowrap text-left">
              Configuración
            </span>
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

          {/* TAB: DASHBOARD / HISTORIAL */}
          {activeTab === "dashboard" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${styles.card} flex items-center gap-4`}>
                  <div className={`${styles.statIconContainer} ${styles.statIconPrimary}`}>
                    <Car size={32} />
                  </div>
                  <div>
                    <h3 className={styles.cardTitle}>
                      Vehículos Hoy
                    </h3>
                    <p className={styles.cardValue}>
                      {todayStats.vehicles}
                    </p>
                  </div>
                </div>
                <div className={`${styles.card} flex flex-col justify-center`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`${styles.statIconContainer} ${styles.statIconSuccess}`}>
                        <DollarSign size={32} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`${styles.cardTitle} truncate`}>
                          Recaudo Actual (En Caja)
                        </h3>
                        <p className={`${styles.cardValue} truncate`}>
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(todayStats.revenue)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseRegister}
                      disabled={isClosingRegister || todayStats.revenue === 0}
                      className={`${styles.btnSecondary} truncate w-full sm:w-auto`}
                    >
                      {isClosingRegister ? "Cerrando..." : "Cerrar Caja"}
                    </button>
                  </div>
                </div>
              </div>

              {weeklyStats.length > 0 && (
                <div className={styles.card}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <h3 className="text-slate-700  font-extrabold break-words">
                      Ingresos Acumulados (
                      {statPeriod === "7days"
                        ? "Últimos 7 Días"
                        : "Últimos 30 Días"}
                      ):
                      <span className="sm:ml-2 text-emerald-600 font-bold">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(
                          weeklyStats.reduce(
                            (sum, stat) => sum + stat.amount,
                            0,
                          ),
                        )}
                      </span>
                    </h3>
                    <select
                      value={statPeriod}
                      onChange={(e) => {
                        const newPeriod = e.target.value as "7days" | "30days";
                        setStatPeriod(newPeriod);
                        fetchStats(parkingLot.id, newPeriod);
                      }}
                      className="px-3 py-1.5 border border-slate-200  text-sm rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="7days">Últimos 7 días</option>
                      <option value="30days">Últimos 30 días</option>
                    </select>
                  </div>
                  <div className="h-64 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyStats}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E2E8F0"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <RechartsTooltip
                          cursor={{ fill: "#f1f5f9" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-indigo-900 text-slate-900 text-xs py-1.5 px-3 rounded shadow-md border border-slate-100 border border-slate-700">
                                  <p className="font-bold mb-1">
                                    {payload[0].payload.date}
                                  </p>
                                  <p className="text-emerald-400 font-bold">
                                    {new Intl.NumberFormat("es-CO", {
                                      style: "currency",
                                      currency: "COP",
                                      minimumFractionDigits: 0,
                                    }).format(payload[0].value as number)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <AdminHistory parkingLot={parkingLot} />
            </div>
          )}

          {/* TAB: INGRESO MANUAL */}
          {activeTab === "cash_closures" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CashClosuresHistory parkingLotId={parkingLot.id} />
            </div>
          )}

          {activeTab === "manual_entry" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ManualEntry
                parkingLot={parkingLot}
                allowedVehicles={allowedVehicles}
                customFields={customFields}
              />
            </div>
          )}

          {/* TAB: TARIFAS */}
          {activeTab === "tariffs" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TariffSettings
                parkingLotId={parkingLot.id}
                allowedVehicles={allowedVehicles}
              />
            </div>
          )}

          {/* TAB: ABONADOS MENSUALES */}
          {activeTab === "subscribers" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MonthlySubscribers parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* TAB: LISTA NEGRA */}
          {activeTab === "blacklist" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Blacklist parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* TAB: EMPLEADOS */}
          {activeTab === "employees" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <EmployeeManagement
                parkingLotId={parkingLot.id}
                initialEmployees={employees}
              />
            </div>
          )}

          {/* TAB: REGISTRO DE TURNOS */}
          {activeTab === "employee_logs" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <EmployeeLogs parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* TAB: PARQUEADEROS PRIVADOS */}
          {activeTab === "private_parking" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PrivateParking parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* TAB: CONFIGURACIÓN */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={styles.card}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-slate-100 text-slate-600  rounded-3xl">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className={styles.sectionTitle}>
                      Configuración del Parqueadero
                    </h2>
                    <p className={styles.sectionSubtitle}>
                      Ajustes generales y campos personalizados
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className={styles.inputLabel}>
                        NIT del Parqueadero
                      </label>
                      <input
                        type="text"
                        value={parkingLot?.nit || ""}
                        className={`${styles.inputField} ${styles.inputFieldDisabled}`}
                        placeholder="Ej. 900.123.456-7"
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className={styles.inputLabel}>
                        Dirección Comercial
                      </label>
                      <input
                        type="text"
                        value={parkingLot?.address || ""}
                        className={`${styles.inputField} ${styles.inputFieldDisabled}`}
                        placeholder="Ej. Calle 123 #45-67"
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className={styles.inputLabel}>
                        Capacidad Total
                      </label>
                      <input
                        type="number"
                        value={capacity || ""}
                        onChange={(e) => setCapacity(e.target.value)}
                        className={styles.inputField}
                        placeholder="Ej. 100"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className={styles.inputLabel}>
                        Minutos de Cortesía (Entrada Gratis) *
                      </label>
                      <input
                        type="number"
                        value={parkingLot?.entry_grace_period_mins ?? 0}
                        onChange={(e) =>
                          setParkingLot({
                            ...parkingLot!,
                            entry_grace_period_mins:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className={styles.inputField}
                        placeholder="Ej. 0"
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Si está en 0, se empieza a cobrar acorde a la tabla
                        desde el minuto 1.
                      </p>
                    </div>
                    <div>
                      <label className={styles.inputLabel}>
                        Minutos de Gabela de Turno *
                      </label>
                      <input
                        type="number"
                        value={parkingLot?.shift_grace_period_mins ?? 15}
                        onChange={(e) =>
                          setParkingLot({
                            ...parkingLot!,
                            shift_grace_period_mins:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className={styles.inputField}
                        placeholder="Ej. 15"
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Tiempo extra para salir o entrar sin cobrar el turno
                        adyacente.
                      </p>
                    </div>

                    <div>
                      <label className={`${styles.inputLabel} mb-3`}>
                        Opciones de Visibilidad
                      </label>
                      <label className={`${styles.checkboxContainer} flex-row !justify-start gap-3 p-3`}>
                        <input
                          type="checkbox"
                          checked={showRevenue}
                          onChange={(e) => setShowRevenue(e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span className={styles.checkboxLabel}>
                          Mostrar recaudo a usuarios (operarios)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200  pt-6">
                    <label className={`${styles.sectionTitle} mb-4 block`}>
                      Preferencias Globales para Empleados
                    </label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <label className={styles.checkboxContainer}>
                        <div>
                          <span className={styles.checkboxLabel}>
                            Impresión Automática
                          </span>
                          <span className={styles.checkboxDesc}>
                            Abre el recibo sin preguntar al ingresar un
                            vehículo.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={parkingSettings?.autoPrint || false}
                          onChange={(e) =>
                            setParkingSettings({
                              ...parkingSettings,
                              autoPrint: e.target.checked,
                            })
                          }
                          className={styles.checkbox}
                        />
                      </label>

                      <label className={styles.checkboxContainer}>
                        <div>
                          <span className={styles.checkboxLabel}>
                            Confirmación de Ingreso
                          </span>
                          <span className={styles.checkboxDesc}>
                            Muestra un aviso intermedio para evitar
                            equivocaciones.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={parkingSettings?.confirmEntry || false}
                          onChange={(e) =>
                            setParkingSettings({
                              ...parkingSettings,
                              confirmEntry: e.target.checked,
                            })
                          }
                          className={styles.checkbox}
                        />
                      </label>

                      <label className={styles.checkboxContainer}>
                        <div>
                          <span className={styles.checkboxLabel}>
                            Mostar Observaciones Adicionales
                          </span>
                          <span className={styles.checkboxDesc}>
                            Campo libre para nota de golpes o rayones.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={parkingSettings?.showNotes || false}
                          onChange={(e) =>
                            setParkingSettings({
                              ...parkingSettings,
                              showNotes: e.target.checked,
                            })
                          }
                          className={styles.checkbox}
                        />
                      </label>

                      {parkingSettings?.showNotes && (
                        <label className={`${styles.checkboxContainer} animate-in fade-in slide-in-from-top-3`}>
                          <div>
                            <span className={styles.checkboxLabel}>
                              Exigir Foto de Observación
                            </span>
                            <span className={styles.checkboxDesc}>
                              Obliga a tomar una foto con la cámara si hay
                              observaciones.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={parkingSettings?.requirePhoto || false}
                            onChange={(e) =>
                              setParkingSettings({
                                ...parkingSettings,
                                requirePhoto: e.target.checked,
                              })
                            }
                            className={styles.checkbox}
                          />
                        </label>
                      )}

                      {parkingLot?.features?.whatsapp_receipts && (
                        <label className={styles.checkboxContainer}>
                          <div>
                            <span className={styles.checkboxLabel}>
                              Envío Automático de WhatsApp
                            </span>
                            <span className={styles.checkboxDesc}>
                              Si el parqueadero tiene WhatsApp activado, enviar
                              el recibo de forma automática al registrar salida.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={parkingSettings?.auto_send_whatsapp || false}
                            onChange={(e) =>
                              setParkingSettings({
                                ...parkingSettings,
                                auto_send_whatsapp: e.target.checked,
                              })
                            }
                            className={styles.checkbox}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`${styles.inputLabel} mb-3`}>
                      Tipos de Vehículos Permitidos
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {vehicleTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleVehicleType(type)}
                          className={`${styles.btnOutline} ${allowedVehicles.includes(type) ? styles.btnOutlineActive : styles.btnOutlineInactive}`}
                        >
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200  pt-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className={styles.sectionTitle}>
                          Estado del Software y Plan
                        </h3>
                        <p className={styles.sectionSubtitle}>
                          Información sobre su plan actual y capacidades
                        </p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 bg-slate-50  p-4 rounded-3xl border border-slate-200 ">
                      <div className="space-y-4">
                        <div>
                          <label className={styles.inputLabel}>
                            Fecha de Expiración
                          </label>
                          <div className="w-full p-3.5 border border-slate-200  rounded-3xl bg-white  text-slate-600  font-mono text-sm cursor-not-allowed">
                            {parkingLot?.subscription_end_date
                              ? new Date(
                                  parkingLot.subscription_end_date,
                                ).toLocaleDateString()
                              : "No especificada (Suscripción Ilimitada o Pendiente)"}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Contacte al proveedor para renovar.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 p-3 border border-slate-200  rounded-3xl bg-white ">
                          <div
                            className={`w-3 h-3 rounded-full ${parkingLot?.is_suspended ? "bg-red-500" : "bg-emerald-500"}`}
                          ></div>
                          <span className="text-slate-700  font-bold text-sm">
                            Estado:{" "}
                            <span
                              className={
                                parkingLot?.is_suspended
                                  ? "text-red-600 font-bold"
                                  : "text-emerald-600 font-bold"
                              }
                            >
                              {parkingLot?.is_suspended
                                ? "Suspendido"
                                : "Operativo (Activo)"}
                            </span>
                          </span>
                        </div>

                        {parkingLot?.subscription_plans ? (
                          <div className="p-3 border border-slate-200  rounded-3xl bg-white  space-y-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-extrabold">
                              Plan Actual
                            </div>
                            <div className="text-sm font-bold text-violet-700">
                              {parkingLot.subscription_plans.name}
                            </div>
                            <div className="flex gap-3 text-xs text-slate-600  mt-2">
                              {parkingLot.subscription_plans
                                .allow_custom_roles && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded">
                                  Roles Pers.
                                </span>
                              )}
                              {parkingLot.subscription_plans
                                .allow_monthly_subscribers && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded">
                                  Abonados
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 border border-amber-200 bg-amber-50 rounded-3xl text-sm text-amber-700">
                            Sin plan específico configurado.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200  pt-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className={styles.sectionTitle}>
                          Campos Personalizados (Visitantes)
                        </h3>
                        <p className={styles.sectionSubtitle}>
                          Datos extra a pedir al ingresar un vehículo (Ej.
                          Casco, Teléfono)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="flex items-center gap-3 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-indigo-100 px-3 py-3 rounded-3xl transition-colors"
                      >
                        <Plus size={16} />
                        Añadir Campo
                      </button>
                    </div>

                    <div className="space-y-3 mt-4 mb-6">
                      {customFields.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50  rounded-3xl border border-dashed border-slate-200  text-slate-500 text-sm">
                          No hay campos personalizados configurados.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customFields.map((field, idx) => (
                            <div
                              key={idx}
                              className={styles.customFieldRow}
                            >
                              <input
                                type="text"
                                value={field.name || ""}
                                onChange={(e) =>
                                  updateCustomField(idx, "name", e.target.value)
                                }
                                placeholder="Nombre del campo (Ej. Casco)"
                                className={`${styles.inputField} flex-1 text-sm`}
                                required
                              />
                              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 ">
                                  <input
                                    type="checkbox"
                                    checked={field.required || false}
                                    onChange={(e) =>
                                      updateCustomField(
                                        idx,
                                        "required",
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4 text-slate-800 rounded border-slate-300  focus:ring-indigo-500"
                                  />
                                  Obligatorio
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeCustomField(idx)}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-red-500 rounded-full transition-all shadow-md border border-slate-100 hover:shadow-md border border-slate-100 active:scale-95"
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
                  </div>

                  <div className="border-t border-slate-200  pt-8 mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className={styles.sectionTitle}>
                          Campos Parqueadero Privado
                        </h3>
                        <p className={styles.sectionSubtitle}>
                          Datos extra a pedir o mostrar para los registros de
                          parqueo privado (Ej. Placa, Teléfono)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addPrivateCustomField}
                        className="flex items-center gap-3 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-3 rounded-3xl transition-colors"
                      >
                        <Plus size={16} />
                        Añadir Campo Privado
                      </button>
                    </div>

                    <div className="space-y-3 mt-4 mb-6">
                      {privateCustomFields.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50  rounded-3xl border border-dashed border-slate-200  text-slate-500 text-sm">
                          No hay campos personalizados configurados para
                          parqueaderos privados.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {privateCustomFields.map((field, idx) => (
                            <div
                              key={idx}
                              className={styles.customFieldRow}
                            >
                              <input
                                type="text"
                                value={field.name || ""}
                                onChange={(e) =>
                                  updatePrivateCustomField(
                                    idx,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Nombre del campo (Ej. Placa)"
                                className={`${styles.inputField} flex-1 text-sm focus:ring-emerald-500 focus:border-emerald-500`}
                                required
                              />
                              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 ">
                                  <input
                                    type="checkbox"
                                    checked={field.required || false}
                                    onChange={(e) =>
                                      updatePrivateCustomField(
                                        idx,
                                        "required",
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300  focus:ring-emerald-500"
                                  />
                                  Obligatorio
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 ">
                                  <input
                                    type="checkbox"
                                    checked={field.visible || false}
                                    onChange={(e) =>
                                      updatePrivateCustomField(
                                        idx,
                                        "visible",
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300  focus:ring-emerald-500"
                                  />
                                  Visible (Vigilante)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removePrivateCustomField(idx)}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-red-500 rounded-full transition-all shadow-md border border-slate-100 hover:shadow-md border border-slate-100 active:scale-95"
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
                  </div>

                  <div className="pt-4">
                    {showSqlAlert && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-3xl space-y-3">
                        <h4 className="text-red-800 font-bold flex items-center gap-3">
                          <CheckCircle2 size={20} />
                          Comando de Base de Datos Requerido
                        </h4>
                        <p className="text-red-700 text-sm">
                          Para guardar las nuevas preferencias de impresión y
                          opciones, debes añadir la columna{" "}
                          <code>settings</code> jsonb en tu base de datos
                          mediante el editor SQL de Supabase:
                        </p>
                        <pre className="p-3 bg-red-950 text-red-50 font-mono text-sm rounded-3xl overflow-x-auto">
                          ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS
                          settings JSONB DEFAULT
                          &apos;&#123;&quot;autoPrint&quot;:
                          false&#125;&apos;::jsonb;
                        </pre>
                        <button
                          type="button"
                          onClick={() => setShowSqlAlert(false)}
                          className="text-sm font-bold text-red-700 hover:text-red-800 underline"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isUpdatingSettings}
                      className={`${styles.btnPrimary} w-full md:w-auto`}
                    >
                      {isUpdatingSettings ? (
                        <Spinner size={20} className="text-slate-900" />
                      ) : (
                        <Settings size={20} />
                      )}
                      {isUpdatingSettings
                        ? "Guardando..."
                        : "Guardar Configuración"}
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
