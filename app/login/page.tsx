"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogIn, ArrowLeft, Car, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
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
    <div className="min-h-dvh relative flex flex-col items-center justify-center p-4 bg-slate-100">

      {/* Botón de regreso */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-700 hover:text-indigo-700 transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Regresar
        </Link>
      </div>

      {/* Estado de conexión */}
      <div className="absolute top-6 right-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
          isOnline
            ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
            : "bg-rose-100 border border-rose-300 text-rose-800"
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? "En línea" : "Sin conexión"}
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className="relative w-full max-w-md z-10">
        <div className="relative rounded-2xl p-8 md:p-10 bg-white border border-slate-300 shadow-md">
          {/* Logo e icono */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-indigo-700 text-white shadow-sm">
              <Car size={32} />
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900">
              Bienvenido a NexoPark
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="alert-error flex items-start gap-3 mb-6 bg-rose-50 border border-rose-300 rounded-xl p-3">
              <span className="text-rose-700 mt-0.5 shrink-0">⚠</span>
              <span className="text-sm font-medium text-rose-900">{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-slate-700">
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
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-slate-700">
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
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
            </button>
          </form>

          {/* Footer de la tarjeta */}
          <p className="text-center text-xs mt-6 text-slate-500">
            Sistema seguro • Datos protegidos con RLS
          </p>
        </div>
      </div>

      {/* Texto de marca inferior */}
      <p className="relative z-10 mt-8 text-xs font-semibold text-slate-600">
        NexoPark © 2026 · Todos los derechos reservados
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-slate-100">
          <Spinner size={32} className="text-indigo-700" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
