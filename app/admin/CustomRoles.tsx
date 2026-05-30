"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Save,
  X,
  Edit2,
  Search,
  Copy,
} from "lucide-react";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { sanitizeInput } from "@/lib/sanitize";

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "Ver Panel Principal" },
  { id: "manage_vehicles", label: "Ingresar/Dar Salida a Vehículos" },
  { id: "manual_entry", label: "Ingreso Manual (Histórico)" },
  { id: "manage_tariffs", label: "Gestionar Tarifas" },
  { id: "manage_employees", label: "Gestionar Empleados" },
  { id: "view_reports", label: "Ver Reportes y Finanzas" },
  { id: "manage_settings", label: "Configuración del Parqueadero" },
];

const SQL_SCRIPT = `
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
`;

export default function CustomRoles({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSqlScript, setShowSqlScript] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });

      if (error) {
        if (
          error.code === "42P01" ||
          error.code === "PGRST205" ||
          error.message?.includes("does not exist")
        ) {
          setRoles([]);
          setShowSqlScript(true);
        } else {
          throw error;
        }
      } else {
        setRoles(data || []);
        setShowSqlScript(false);
      }
    } catch (err: any) {
      console.error("Error fetching roles:", err);
      if (
        err.code === "42P01" ||
        err.code === "PGRST205" ||
        err.message?.includes("does not exist")
      ) {
        setShowSqlScript(true);
      } else {
        setError(err.message || "Error al cargar los roles.");
      }
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const togglePermission = (permId: string) => {
    if (newRolePermissions.includes(permId)) {
      setNewRolePermissions(newRolePermissions.filter((p) => p !== permId));
    } else {
      setNewRolePermissions([...newRolePermissions, permId]);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setError("El nombre del rol es obligatorio");
      return;
    }

    // Check for uniqueness
    const isDuplicate = roles.some(
      (r) => r.name.toLowerCase() === newRoleName.trim().toLowerCase(),
    );
    if (isDuplicate) {
      setError("Ya existe un rol con este nombre en tu parqueadero.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      if (editingRoleId) {
        const { error } = await supabase
          .from("custom_roles")
          .update({
            name: sanitizeInput(newRoleName),
            permissions: newRolePermissions,
          })
          .eq("id", editingRoleId);

        if (error) throw error;
        setSuccess("Rol actualizado exitosamente");
      } else {
        const { error } = await supabase.from("custom_roles").insert([
          {
            name: sanitizeInput(newRoleName),
            permissions: newRolePermissions,
            parking_lot_id: parkingLotId,
          },
        ]);

        if (error) throw error;
        setSuccess("Rol creado exitosamente");
      }

      setNewRoleName("");
      setNewRolePermissions([]);
      setIsCreating(false);
      setEditingRoleId(null);
      fetchRoles();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      if (
        err.code === "42P01" ||
        err.code === "PGRST205" ||
        err.message?.includes("does not exist")
      ) {
        setShowSqlScript(true);
      } else {
        setError(
          err.message ||
            "Error al guardar el rol. Verifica que hayas ejecutado el script SQL.",
        );
      }
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este rol?")) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchRoles();
    } catch (err: any) {
      setError(err.message || "Error al eliminar el rol");
    }
  };

  const handleEditClick = (role: any) => {
    setEditingRoleId(role.id);
    setNewRoleName(role.name);
    setNewRolePermissions(role.permissions || []);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingRoleId(null);
    setNewRoleName("");
    setNewRolePermissions([]);
  };

  const copySqlScript = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setSuccess("Script SQL copiado al portapapeles");
    setTimeout(() => setSuccess(""), 3000);
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">Cargando roles...</div>
    );

  if (showSqlScript) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-3xl text-red-600">
              <X size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                ¡Atención! Faltan tablas en la Base de Datos
              </h2>
              <p className="mt-1 opacity-90">
                Por favor, asegúrate de que el administrador general
                (SuperAdmin) haya ejecutado el archivo de base de datos SQL
                actualizado (`supabase-schema.sql`) para habilitar el sistema de
                roles.
              </p>
            </div>
          </div>
          {success && <SuccessMessage message={success} />}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setLoading(true);
                fetchRoles();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-3xl transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Roles Personalizados
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea roles con permisos específicos para asignar a los empleados.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-3 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-colors shadow-xl border border-slate-100 shadow-slate-200 flex items-center gap-3"
          >
            <Plus size={20} />
            Nuevo Rol
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3 font-bold text-sm">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {isCreating && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {editingRoleId ? "Editar Rol" : "Crear Nuevo Rol"}
          </h3>
          <form onSubmit={handleCreateRole} className="space-y-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Nombre del Rol
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                placeholder="ej. Supervisor, Cajero, Auditor"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                Permisos Asignados
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`p-4 rounded-3xl border cursor-pointer flex items-center gap-3 transition-all ${
                      newRolePermissions.includes(perm.id)
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xl border border-slate-100"
                        : "bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-slate-200"
                    }`}
                  >
                    {newRolePermissions.includes(perm.id) ? (
                      <CheckSquare
                        size={20}
                        className="text-slate-900 flex-shrink-0"
                      />
                    ) : (
                      <Square
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    )}
                    <span className="font-bold text-sm leading-tight">
                      {perm.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-3xl font-bold hover:bg-slate-50 transition-colors w-full sm:w-auto text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-xl border border-slate-100 shadow-slate-200 w-full sm:w-auto"
              >
                <Save size={20} />
                {editingRoleId ? "Actualizar Rol" : "Guardar Rol"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900">Roles Existentes</h3>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar roles..."
            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-3xl pl-10 pr-4 py-3.5 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all shadow-xl border border-slate-100"
          />
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col group hover:border-indigo-100 hover:shadow-xl border border-slate-100 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-slate-900 transition-colors">
                  <Shield size={24} />
                </div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">
                  {role.name}
                </h3>
              </div>
              <div className="flex gap-1 bg-slate-50 p-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEditClick(role)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-3xl transition-all"
                  title="Editar rol"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-all shadow-md border border-slate-100 hover:shadow-xl border border-slate-100 active:scale-95"
                  title="Eliminar rol"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-3xl p-4 border border-slate-50">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Permisos ({role.permissions?.length || 0})
              </h4>
              <ul className="space-y-2">
                {role.permissions?.slice(0, 4).map((permId: string) => {
                  const perm = AVAILABLE_PERMISSIONS.find(
                    (p) => p.id === permId,
                  );
                  return (
                    <li
                      key={permId}
                      className="text-sm font-bold text-slate-600 flex items-start gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <span className="leading-tight">
                        {perm ? perm.label : permId}
                      </span>
                    </li>
                  );
                })}
                {role.permissions?.length > 4 && (
                  <li className="text-xs font-bold text-indigo-500 pt-2">
                    + {role.permissions.length - 4} más
                  </li>
                )}
                {(!role.permissions || role.permissions.length === 0) && (
                  <li className="text-sm text-slate-400 font-bold italic">
                    Sin permisos asignados
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}

        {roles.length === 0 && !isCreating && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border-2 border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No hay roles personalizados
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Crea roles para asignar permisos específicos a tus empleados.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-3 shadow-xl border border-slate-100 shadow-slate-200"
            >
              <Plus size={20} />
              Crear el primer rol
            </button>
          </div>
        )}
        {roles.length > 0 && filteredRoles.length === 0 && (
          <div className="col-span-full p-12 text-center font-bold text-slate-500 bg-white rounded-3xl border border-slate-100">
            No se encontraron roles que coincidan con &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
