"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, ArrowLeft, Car, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
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

    // Ensure device ID exists
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
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

      if (profileData && (profileData.role === "admin" || profileData.role === "employee")) {
        // Verificar si el parqueadero tiene habilitada la configuración de seguridad de dispositivos
        const requireDeviceApproval = (profileData.parking_lots as any)?.features?.require_device_approval === true;

        if (requireDeviceApproval) {
          // Device approval flow for non-superadmins
          const { data: deviceApproval, error: deviceError } = await supabase
            .from("device_approvals")
            .select("*")
            .eq("user_id", data.user.id)
            .eq("device_id", deviceId)
            .single();

          const userAgent = navigator.userAgent;

          // Try fetching IP (client side fetch is best effort)
          let ipAddress = "Desconocida";
          try {
            const res = await fetch("https://api.ipify.org?format=json");
            const ipData = await res.json();
            ipAddress = ipData.ip;
          } catch (e) {
             console.error("Could not fetch IP", e);
          }

          if (deviceError && deviceError.code === "PGRST116") {
             // Not found, create pending request
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
               router.push("/pending-approval");
               return;
             } else if (deviceApproval.status === "pending") {
               router.push("/pending-approval");
               return;
             } else if (deviceApproval.status === "approved") {
               // Check expiration
               if (deviceApproval.expires_at && new Date(deviceApproval.expires_at) < new Date()) {
                  // Expired, set to pending
                  await supabase.from("device_approvals").update({ status: "pending" }).eq("id", deviceApproval.id);
                  router.push("/pending-approval");
                  return;
               }
               // Approved and valid - flow will continue below
             }
          }
        }
      }

      // If we got here, it's either a superadmin, or an admin/employee without device restrictions, or an approved device
      if (profileData && profileData.role === "superadmin") {
        router.push("/superadmin");
      } else if (profileData && profileData.role === "admin") {
        router.push("/admin");
      } else if (profileData && profileData.role === "employee") {
        router.push("/employee");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden ">
      {/* Decorative background matching Landing Page */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white -z-10"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-10 relative z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-bold">Regresar</span>
        </Link>

        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.1,
            }}
            className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200"
          >
            <Car size={36} strokeWidth={2} />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Accede al panel de control
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Usuario o Correo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
              placeholder="tu_usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-indigo-600 disabled:opacity-70 disabled:hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 mt-8"
          >
            {loading ? (
              <Spinner size={22} className="text-white" />
            ) : (
              <LogIn size={22} />
            )}
            {loading ? "Verificando..." : "Entrar al Sistema"}
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-bold">
          Cargando...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
