"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft, UserPlus, ShieldCheck, Car, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { createUser } from "@/app/actions/auth";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("superadmin");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!isSupabaseConfigured) {
      setError("Error de conexión: Supabase no está configurado. Verifica las variables de entorno.");
      setLoading(false);
      return;
    }

    try {
      const loginEmail = username.includes("@") 
        ? username.trim().toLowerCase() 
        : `${username.toLowerCase().trim()}@parkingapp.local`;

      if (isLogin) {
        // LOGIN FLOW
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (authError) {
          setError(authError.message === "Failed to fetch" ? "Error de conexión con el servidor." : authError.message);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, parking_lot_id")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          setError("Error al obtener perfil de usuario");
          setLoading(false);
          return;
        }

        if (profile.role === "admin") router.push("/admin");
        else if (profile.role === "employee") router.push("/employee");
        else if (profile.role === "superadmin") router.push("/superadmin");
        else router.push("/");

      } else {
        // REGISTER FLOW (Temporary)
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }

        const result = await createUser(loginEmail, password, role, null);

        if (!result.success) {
          setError(result.error || "Error al crear el usuario.");
        } else {
          setSuccess(`¡Usuario ${role} creado exitosamente! Ahora puedes iniciar sesión.`);
          setIsLogin(true);
          setPassword("");
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
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
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30"
          >
            <Car size={40} strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isLogin ? "Bienvenido de nuevo" : "Crear Cuenta"}
          </h1>
          <p className="text-slate-500 mt-2">
            {isLogin ? "Ingresa tus credenciales para continuar" : "Herramienta temporal de registro"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${!isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Registrarse
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 rounded-xl text-sm text-center"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <SuccessMessage message={success} />
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de Usuario
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              >
                <option value="superadmin">Dueño (Super Admin)</option>
                <option value="admin">Administrador de Parqueadero</option>
                <option value="employee">Empleado / Cajero</option>
              </select>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Usuario o Correo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
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
                className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all pr-12"
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
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-70 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <Spinner size={20} className="text-white" />
            ) : isLogin ? (
              <LogIn size={20} />
            ) : (
              <UserPlus size={20} />
            )}
            {loading ? "Procesando..." : isLogin ? "Ingresar al Sistema" : "Crear Usuario"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
