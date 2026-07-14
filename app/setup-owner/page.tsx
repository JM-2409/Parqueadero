"use client";

import { useState } from "react";
import { createUser } from "@/app/actions/auth";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error";
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

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
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
    const loginEmail = trimmedUsername.includes("@")
      ? trimmedUsername.toLowerCase()
      : `${trimmedUsername.toLowerCase()}@parkingapp.local`;

    // Validar que el email no exista en profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", loginEmail.trim())
      .maybeSingle();

    if (existingProfile) {
      setError("Este email ya está registrado en el sistema. Intenta con otro correo.");
      setLoading(false);
      return;
    }

    try {
      // Create superadmin user
      const result = await createUser(loginEmail.trim(), password, "superadmin", null);

      if (!result.success) {
        throw new Error(result.error || "Error al crear el usuario Dueño.");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Error al crear usuario";

      if (message.includes("already registered") || message.includes("already exists")) {
        setError("Este usuario ya existe en autenticación. Por favor, elige otro correo.");
      } else if (message.includes("invalid email")) {
        setError("El formato del email no es válido.");
      } else if (message.includes("password")) {
        setError("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
      } else {
        setError(`Error de servidor: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Crear Dueño (Super Admin)
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Herramienta temporal para recuperar acceso al sistema.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <SuccessMessage
              message={
                <div className="flex flex-col items-center gap-3">
                  <p className="font-bold">
                    ¡Usuario Dueño creado exitosamente!
                  </p>
                  <p className="text-sm">
                    Usuario: <strong>{username}</strong>
                  </p>
                </div>
              }
            />
            <Link
              href="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3"
            >
              Ir a Iniciar Sesión <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreateOwner} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Nombre de Usuario (Dueño)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="ej. admin_principal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3"
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
