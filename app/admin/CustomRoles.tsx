"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Plus, Trash2, CheckSquare, Square, Save, X, Edit2, Search, Copy } from "lucide-react";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "Ver Panel Principal" },
  { id: "manage_vehicles", label: "Ingresar/Dar Salida a Vehículos" },
  { id: "manual_entry", label: "Ingreso Manual (Histórico)" },
  { id: "manage_tariffs", label: "Gestionar Tarifas" },
  { id: "manage_employees", label: "Gestionar Empleados" },
  { id: "view_reports", label: "Ver Reportes y Finanzas" },
  { id: "manage_settings", label: "Configuración del Parqueadero" }
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

export default function CustomRoles({ parkingLotId }: { parkingLotId: string }) {
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
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
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
      if (err.code === '42P01' || err.code === 'PGRST205' || err.message?.includes('does not exist')) {
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
      setNewRolePermissions(newRolePermissions.filter(p => p !== permId));
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
      (r) => r.name.toLowerCase() === newRoleName.trim().toLowerCase()
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
            name: newRoleName.trim(),
            permissions: newRolePermissions
          })
          .eq("id", editingRoleId);
          
        if (error) throw error;
        setSuccess("Rol actualizado exitosamente");
      } else {
        const { error } = await supabase
          .from("custom_roles")
          .insert([{
            name: newRoleName.trim(),
            permissions: newRolePermissions,
            parking_lot_id: parkingLotId
          }]);
          
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
      if (err.code === '42P01' || err.code === 'PGRST205' || err.message?.includes('does not exist')) {
        setShowSqlScript(true);
      } else {
        setError(err.message || "Error al guardar el rol. Verifica que hayas ejecutado el script SQL.");
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando roles...</div>;

  if (showSqlScript) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <X size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">¡Atención! Falta una tabla en la Base de Datos</h2>
              <p className="text-sm font-medium opacity-90">La funcionalidad de Roles Personalizados necesita una actualización en tu base de datos.</p>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <p className="mb-3 text-slate-800">Por favor, dirígete al <strong>SQL Editor</strong> de tu proyecto en Supabase, crea una "New query" y ejecuta el siguiente script exacto:</p>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-50 p-5 rounded-xl overflow-x-auto text-xs font-mono shadow-inner border border-slate-700">
                {SQL_SCRIPT}
              </pre>
              <button 
                onClick={copySqlScript}
                className="absolute top-3 right-3 p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
              >
                <Copy size={16} /> Copiar Script
              </button>
            </div>
          </div>
          {success && <SuccessMessage message={success} />}
          <div className="mt-4 flex justify-end">
             <button
                onClick={() => {
                  setLoading(true);
                  fetchRoles();
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
             >
                Ya ejecuté el script, recargar
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Roles Personalizados</h2>
          <p className="text-sm text-slate-500">Crea roles con permisos específicos para asignar a los empleados de tu parqueadero</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Rol
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <X size={20} />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">{editingRoleId ? 'Editar Rol' : 'Crear Nuevo Rol'}</h3>
          <form onSubmit={handleCreateRole} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Rol</label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="ej. Supervisor, Cajero, Auditor"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Permisos Asignados</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <div 
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                      newRolePermissions.includes(perm.id) 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {newRolePermissions.includes(perm.id) ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} className="text-slate-400" />
                    )}
                    <span className="font-medium text-sm">{perm.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                {editingRoleId ? 'Actualizar Rol' : 'Guardar Rol'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-medium text-slate-900">Roles Existentes</h3>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar roles..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map(role => (
          <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Shield size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">{role.name}</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEditClick(role)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Editar rol"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Eliminar rol"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Permisos ({role.permissions?.length || 0})</h4>
              <ul className="space-y-1">
                {role.permissions?.map((permId: string) => {
                  const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                  return (
                    <li key={permId} className="text-sm text-slate-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {perm ? perm.label : permId}
                    </li>
                  );
                })}
                {(!role.permissions || role.permissions.length === 0) && (
                  <li className="text-sm text-slate-400 italic">Sin permisos asignados</li>
                )}
              </ul>
            </div>
          </div>
        ))}
        
        {roles.length === 0 && !isCreating && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
            <Shield size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No hay roles personalizados</h3>
            <p className="text-slate-500 mb-4">Crea roles para asignar permisos específicos a tus empleados.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Crear el primer rol
            </button>
          </div>
        )}
        {roles.length > 0 && filteredRoles.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500">
            No se encontraron roles que coincidan con &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
