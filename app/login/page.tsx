"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Error de conexión: Supabase no está configurado. Verifica las variables de entorno.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username.toLowerCase().trim()}@parkingapp.local`,
        password,
      });

      if (authError) {
        setError(authError.message === "Failed to fetch" ? "Error de conexión con el servidor. Verifica tu internet o la configuración de Supabase." : authError.message);
        setLoading(false);
        return;
      }

      // Fetch user profile to determine role
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

      if (profile.role === "admin") {
        router.push("/admin");
      } else if (profile.role === "employee") {
        router.push("/employee");
      } else if (profile.role === "superadmin") {
        router.push("/superadmin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Volver</span>
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h1>
          <p className="text-slate-500 mt-2">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="ej. admin123"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Ingresando..." : "Ingresar al Sistema"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/setup" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Ver Historial de Versiones
          </Link>
        </div>
      </div>
    </div>
  );
}
