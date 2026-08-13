"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, ArrowLeft, Car, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ParkingLotData {
  id?: number | string;
  is_suspended?: boolean;
  features?: {
    require_device_approval?: boolean;
    [key: string]: unknown;
  };
}

function LoginContent() {
  const isOnline = useOnlineStatus();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState(() => {
    const errParam = searchParams.get("error");
    if (errParam === "suspended") return "La plataforma ha sido suspendida para este parqueadero.";
    if (errParam === "expired") return "Tu suscripción ha expirado. Por favor, contacta a ventas o actualiza tu suscripción.";
    return "";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Error de conexión: Supabase no está configurado. Verifica las variables de entorno.");
      setLoading(false);
      return;
    }

    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }

    try {
      const loginEmail = username.includes("@")
        ? username.trim().toLowerCase()
        : `${username.toLowerCase().trim()}@parkingapp.local`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

      if (authError) {
        setError(authError.message === "Failed to fetch" ? "Error de conexión con el servidor." : authError.message);
        setLoading(false);
        return;
      }

      let profileData = null;
      let profileError = null;

      const { data: profileWithSuspended, error: errWithSuspended } = await supabase
        .from("profiles")
        .select("role, parking_lot_id, parking_lots(is_suspended, features)")
        .eq("id", data.user.id)
        .single();

      if (errWithSuspended && errWithSuspended.message.includes("is_suspended")) {
        const { data: profileFallback, error: errFallback } = await supabase
          .from("profiles")
          .select("role, parking_lot_id, parking_lots(id, features)")
          .eq("id", data.user.id)
          .single();
        profileData = profileFallback;
        profileError = errFallback;
      } else {
        profileData = profileWithSuspended;
        profileError = errWithSuspended;
      }

      if (profileError) {
        if (profileError.code === "PGRST116") {
          setError("No se encontró un perfil asociado a esta cuenta. Verifica tu registro o contacta al administrador.");
        } else {
          setError("Error al obtener perfil de usuario: " + profileError.message);
        }
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profileData && profileData.parking_lots && (profileData.parking_lots as ParkingLotData).is_suspended) {
        await supabase.auth.signOut();
        setError("La plataforma está suspendida para este parqueadero. Por favor renueva tu suscripción.");
        setLoading(false);
        return;
      }

      if (profileData && (profileData.role === "admin" || profileData.role === "employee")) {
        const requireDeviceApproval = (profileData.parking_lots as ParkingLotData)?.features?.require_device_approval === true;
        if (requireDeviceApproval) {
          const { data: deviceApproval, error: deviceError } = await supabase
            .from("device_approvals")
            .select("*")
            .eq("user_id", data.user.id)
            .eq("device_id", deviceId)
            .single();

          const userAgent = navigator.userAgent;
          let ipAddress = "Desconocida";
          try {
            const res = await fetch("https://api.ipify.org?format=json");
            const ipData = await res.json();
            ipAddress = ipData.ip;
          } catch (e) { console.error("Could not fetch IP", e); }

          if (deviceError && deviceError.code === "PGRST116") {
            await supabase.from("device_approvals").insert([{
              user_id: data.user.id,
              parking_lot_id: profileData.parking_lot_id,
              device_id: deviceId,
              ip_address: ipAddress,
              user_agent: userAgent,
              status: "pending"
            }]);
            router.push("/pending-approval");
            return;
          } else if (deviceApproval) {
            if (deviceApproval.status === "rejected") {
              await supabase.auth.signOut();
              setError("Acceso denegado: Este dispositivo no tiene autorización para acceder.");
              setLoading(false);
              return;
            } else if (deviceApproval.status === "pending") {
              router.push("/pending-approval");
              return;
            } else if (deviceApproval.status === "approved") {
              if (deviceApproval.expires_at && new Date(deviceApproval.expires_at) < new Date()) {
                await supabase.from("device_approvals").update({ status: "pending" }).eq("id", deviceApproval.id);
                router.push("/pending-approval");
                return;
              }
            }
          }
        }
      }

      if (profileData?.role === "superadmin") router.push("/superadmin");
      else if (profileData?.role === "admin") router.push("/admin");
      else if (profileData?.role === "employee") router.push("/employee");
      else router.push("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center p-4 overflow-hidden" style={{ background: "var(--np-bg-primary)" }}>

      {/* Fondo con orbes animados */}
      <div className="bg-orbs" />

      {/* Malla de puntos decorativa */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Línea de gradiente superior */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)" }}
      />

      {/* Botón de regreso */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 left-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Regresar
        </Link>
      </motion.div>

      {/* Estado de conexión */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 right-6"
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
          isOnline
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? "En línea" : "Sin conexión"}
        </div>
      </motion.div>

      {/* Tarjeta principal */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md z-10"
      >
        {/* Glow detrás de la tarjeta */}
        <div className="absolute -inset-1 rounded-[2rem] opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.3), transparent 70%)" }}
        />

        <div className="relative rounded-[1.75rem] p-8 md:p-10"
          style={{
            background: "rgba(13, 20, 36, 0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Línea de gradiente superior */}
          <div className="absolute top-0 left-8 right-8 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.7), transparent)" }}
          />

          {/* Logo e icono */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.15 }}
              className="relative w-20 h-20 mx-auto mb-5"
            >
              {/* Anillo exterior animado */}
              <div className="absolute inset-0 rounded-2xl animate-pulse-glow"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  padding: "2px",
                }}
              >
                <div className="w-full h-full rounded-[14px]"
                  style={{ background: "var(--np-bg-secondary)" }}
                />
              </div>
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <Car size={34} strokeWidth={2} className="text-white" />
              </div>
            </motion.div>

            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--np-text-primary)" }}>
              Bienvenido a{" "}
              <span className="text-gradient">NexoPark</span>
            </h1>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--np-text-secondary)" }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="alert-error flex items-start gap-3 mb-6"
              >
                <span className="text-rose-400 mt-0.5 shrink-0">⚠</span>
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest"
                style={{ color: "var(--np-text-secondary)" }}>
                Usuario o Correo
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-dark"
                placeholder="tu_usuario o correo@email.com"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest"
                style={{ color: "var(--np-text-secondary)" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--np-text-muted)" }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={isOnline && !loading ? { scale: 1.02 } : {}}
              whileTap={isOnline && !loading ? { scale: 0.97 } : {}}
              type="submit"
              disabled={loading || !isOnline}
              className="btn-primary-glow w-full mt-2"
            >
              {loading ? (
                <Spinner size={20} className="text-white" />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? "Verificando..." : "Entrar al Sistema"}
            </motion.button>
          </form>

          {/* Footer de la tarjeta */}
          <p className="text-center text-xs mt-6" style={{ color: "var(--np-text-muted)" }}>
            Sistema seguro • Datos protegidos con RLS
          </p>
        </div>
      </motion.div>

      {/* Texto de marca inferior */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 mt-8 text-xs font-semibold"
        style={{ color: "var(--np-text-muted)" }}
      >
        NexoPark © 2026 · Todos los derechos reservados
      </motion.p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--np-bg-primary)" }}>
          <Spinner size={32} className="text-indigo-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
