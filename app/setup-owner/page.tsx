"use client";

import { useState } from "react";
import { createUser } from "@/app/actions/auth";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function SetupOwnerPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!username || !password) {
      setError("Por favor, completa todos los campos.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    // Support legacy email logins and new username logins
    const loginEmail = username.includes("@") 
      ? username.trim().toLowerCase() 
      : `${username.toLowerCase().trim()}@parkingapp.local`;

    // Create superadmin user
    const result = await createUser(
      loginEmail,
      password,
      "superadmin",
      null
    );

    if (!result.success) {
      setError(result.error || "Error al crear el usuario Dueño.");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crear Dueño (Super Admin)</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Herramienta temporal para recuperar acceso al sistema.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <SuccessMessage message={
              <div className="flex flex-col items-center gap-2">
                <p className="font-medium">¡Usuario Dueño creado exitosamente!</p>
                <p className="text-sm">Usuario: <strong>{username}</strong></p>
              </div>
            } />
            <Link
              href="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              Ir a Iniciar Sesión <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreateOwner} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de Usuario (Dueño)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="ej. admin_principal"
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
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size={20} className="text-white" />
                  Creando...
                </>
              ) : (
                "Crear Usuario Dueño"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
