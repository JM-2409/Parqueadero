"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LogIn,
  ArrowLeft,
  Car,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ParkingLotData {
  id?: number | string;
  is_suspended?: boolean;
  subscription_end_date?: string | null;
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

      const subscriptionEndDate = (profileData?.parking_lots as ParkingLotData | null)
        ?.subscription_end_date;
      if (
        subscriptionEndDate &&
        new Date(subscriptionEndDate).getTime() < Date.now()
      ) {
        await supabase.auth.signOut();
        setError("Tu suscripción ha expirado. Por favor, contacta a ventas o actualiza tu suscripción.");
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
            router.replace("/pending-approval");
            return;
          } else if (deviceApproval) {
            if (deviceApproval.status === "rejected") {
              await supabase.auth.signOut();
              setError("Acceso denegado: Este dispositivo no tiene autorización para acceder.");
              setLoading(false);
              return;
            } else if (deviceApproval.status === "pending") {
              router.replace("/pending-approval");
              return;
            } else if (deviceApproval.status === "approved") {
              if (deviceApproval.expires_at && new Date(deviceApproval.expires_at) < new Date()) {
                await supabase.from("device_approvals").update({ status: "pending" }).eq("id", deviceApproval.id);
                router.replace("/pending-approval");
                return;
              }
            }
          }
        }
      }

      if (profileData?.role === "superadmin") router.replace("/superadmin");
      else if (profileData?.role === "admin") router.replace("/admin");
      else if (profileData?.role === "employee") router.replace("/employee");
      else router.replace("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(79,70,229,0.28), transparent 35%), radial-gradient(circle at 85% 90%, rgba(8,145,178,0.18), transparent 32%)",
        }}
      />

      <div className="absolute left-4 top-4 z-20 sm:left-8 sm:top-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
          isOnline
            ? "bg-emerald-400/10 border border-emerald-300/30 text-emerald-200"
            : "bg-rose-400/10 border border-rose-300/30 text-rose-200"
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? "En línea" : "Sin conexión"}
        </div>
      </div>

      <main className="relative z-10 w-full max-w-5xl pt-14 sm:pt-12">
        <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-indigo-950 p-10 text-white lg:flex">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5"
            />
            <div className="relative">
              <div className="mb-12 inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                  <Car size={26} />
                </div>
                <span className="text-xl font-extrabold tracking-tight">NexoPark</span>
              </div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                Gestión de parqueaderos
              </p>
              <h2 className="max-w-sm text-3xl font-black leading-tight">
                Tu operación, conectada en un solo lugar.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-indigo-100">
                Ingresa para administrar vehículos, equipo, caja y sedes desde tu espacio de trabajo.
              </p>
            </div>
            <ul className="relative mt-12 space-y-4">
              {[
                "Acceso según tu perfil de usuario",
                "Información organizada por parqueadero",
                "Disponible en computador y celular",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-indigo-100">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="relative mt-10 text-xs text-indigo-300">
              NexoPark · Plataforma de gestión y operación
            </p>
          </aside>

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-sm">
                <Car size={26} />
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
                Portal de acceso
              </p>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Bienvenido de nuevo
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Ingresa tus datos para continuar con la operación de tu parqueadero.
              </p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="alert-error mb-6 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4">
                <span className="mt-0.5 shrink-0 text-rose-700">⚠</span>
                <span className="text-sm font-medium text-rose-900">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-username" className="mb-2 block text-sm font-semibold text-slate-800">
                  Usuario o correo electrónico
                </label>
                <div className="relative">
                  <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-dark pl-11"
                    placeholder="Tu usuario o correo"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-800">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark pr-12"
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isOnline}
                aria-busy={loading}
                className="btn-primary-glow mt-2 min-h-12 w-full"
              >
                {loading ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <LogIn size={20} />
                )}
                {loading ? "Verificando acceso..." : "Ingresar"}
              </button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Acceso seguro y protegido por permisos
            </p>
          </section>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          NexoPark © 2026 · Todos los derechos reservados
        </p>
      </main>
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
