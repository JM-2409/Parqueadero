import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Sistema de Parqueaderos
        </h1>
        <p className="text-slate-500 mb-8">
          Gestión centralizada de múltiples parqueaderos
        </p>

        <div className="space-y-4">
          <Link
            href="/superadmin"
            className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Ingreso Dueño (Super Admin)
          </Link>

          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-medium transition-colors"
          >
            Ingreso Empleados / Administradores
          </Link>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
          <h3 className="font-semibold text-amber-800 mb-2">
            ⚠️ Instrucciones Iniciales
          </h3>
          <p className="text-sm text-amber-700">
            Asegúrate de ejecutar el script SQL{" "}
            <code className="bg-amber-100 px-1 rounded">
              supabase-schema.sql
            </code>{" "}
            en el SQL Editor de tu proyecto de Supabase antes de continuar.
          </p>
        </div>
      </div>
    </div>
  );
}
