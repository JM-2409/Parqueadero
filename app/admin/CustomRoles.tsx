"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Plus, Trash2, CheckSquare, Square, Save, X } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "Ver Panel Principal" },
  { id: "manage_vehicles", label: "Ingresar/Dar Salida a Vehículos" },
  { id: "manual_entry", label: "Ingreso Manual (Histórico)" },
  { id: "manage_tariffs", label: "Gestionar Tarifas" },
  { id: "manage_employees", label: "Gestionar Empleados" },
  { id: "view_reports", label: "Ver Reportes y Finanzas" },
  { id: "manage_settings", label: "Configuración del Parqueadero" }
];

export default function CustomRoles({ parkingLotId }: { parkingLotId: string }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
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
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('Could not find the table') || error.message.includes('column "parking_lot_id" does not exist')) {
          setRoles([]);
          setError("Falta actualizar la tabla en Supabase. Por favor, ejecuta el script SQL que te proporcionó el asistente.");
        } else {
          throw error;
        }
      } else {
        setRoles(data || []);
      }
    } catch (err: any) {
      console.error("Error fetching roles:", err);
      setError(err.message || "Error al cargar los roles.");
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
      const { data, error } = await supabase
        .from("custom_roles")
        .insert([{
          name: newRoleName.trim(),
          permissions: newRolePermissions,
          parking_lot_id: parkingLotId
        }])
        .select();
        
      if (error) throw error;
      
      setSuccess("Rol creado exitosamente");
      setNewRoleName("");
      setNewRolePermissions([]);
      setIsCreating(false);
      fetchRoles();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Error al crear el rol. Verifica que hayas ejecutado el script SQL.");
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

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando roles...</div>;

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
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <X size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckSquare size={20} />
          <p>{success}</p>
        </div>
      )}

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Crear Nuevo Rol</h3>
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
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Guardar Rol
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Shield size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">{role.name}</h3>
              </div>
              <button 
                onClick={() => handleDeleteRole(role.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
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
      </div>
    </div>
  );
}
