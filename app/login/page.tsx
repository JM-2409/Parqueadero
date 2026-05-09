"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogIn,
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Car,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { createUser } from "@/app/actions/auth";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "suspended") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("La plataforma ha sido suspendida para este parqueadero.");
    } else if (errParam === "expired") {
      setError(
        "Tu suscripción ha expirado. Por favor, contacta a ventas o actualiza tu suscripción.",
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError(
        "Error de conexión: Supabase no está configurado. Verifica las variables de entorno.",
      );
      setLoading(false);
      return;
    }

    try {
      const loginEmail = username.includes("@")
        ? username.trim().toLowerCase()
        : `${username.toLowerCase().trim()}@parkingapp.local`;

      // LOGIN FLOW
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: loginEmail,
          password,
        },
      );

      if (authError) {
        setError(
          authError.message === "Failed to fetch"
            ? "Error de conexión con el servidor."
            : authError.message,
        );
        setLoading(false);
        return;
      }

      let profileData = null;
      let profileError = null;

      // Try to fetch with is_suspended first
      const { data: profileWithSuspended, error: errWithSuspended } =
        await supabase
          .from("profiles")
          .select("role, parking_lot_id, parking_lots(is_suspended)")
          .eq("id", data.user.id)
          .single();

      if (
        errWithSuspended &&
        errWithSuspended.message.includes("is_suspended")
      ) {
        // Fallback if column is missing
        const { data: profileFallback, error: errFallback } = await supabase
          .from("profiles")
          .select("role, parking_lot_id, parking_lots(id)")
          .eq("id", data.user.id)
          .single();

        profileData = profileFallback;
        profileError = errFallback;
      } else {
        profileData = profileWithSuspended;
        profileError = errWithSuspended;
      }

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        if (profileError.code === "PGRST116") {
          setError(
            "No se encontró un perfil asociado a esta cuenta. Verifica tu registro o contacta al administrador.",
          );
        } else {
          setError(
            "Error al obtener perfil de usuario: " + profileError.message,
          );
        }
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check suspension
      if (
        profileData &&
        profileData.parking_lots &&
        (profileData.parking_lots as any).is_suspended
      ) {
        await supabase.auth.signOut();
        setError(
          "La plataforma está suspendida para este parqueadero. Por favor renueva tu suscripción.",
        );
        setLoading(false);
        return;
      }

      if (profileData && profileData.role === "admin") router.push("/admin");
      else if (profileData && profileData.role === "employee")
        router.push("/employee");
      else if (profileData && profileData.role === "superadmin")
        router.push("/superadmin");
      else router.push("/");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 relative z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Volver al inicio</span>
        </Link>

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200 shadow-blue-500/30"
          >
            <Car size={40} strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Bienvenido de nuevo
          </h1>
          <p className="text-slate-500 mt-2">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 rounded-2xl text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Usuario o Correo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              placeholder="ej. admin123 o correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 disabled:opacity-70 text-white rounded-2xl font-medium transition-all shadow-sm border border-slate-200 shadow-blue-500/25 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <Spinner size={20} className="text-white" />
            ) : (
              <LogIn size={20} />
            )}
            {loading ? "Procesando..." : "Iniciar Sesión"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          Cargando...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
