"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, X, Home, Search, Edit2 } from "lucide-react";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { Spinner } from "@/components/ui/Spinner";

export default function PrivateParking({ parkingLotId }: { parkingLotId: string }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  
  const [spaceData, setSpaceData] = useState({
    block: "",
    house_or_apartment: "",
    owner_name: "",
    space_number: ""
  });

  const fetchSpaces = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("private_parking_spaces")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          setSpaces([]);
          setError("La tabla 'private_parking_spaces' no existe. Por favor, ejecuta el script SQL de actualización.");
        } else {
          throw error;
        }
      } else {
        setSpaces(data || []);
      }
    } catch (err: any) {
      console.error("Error fetching spaces:", err);
      setError(err.message || "Error al cargar los espacios.");
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!spaceData.space_number.trim()) {
      setError("El número de parqueadero es obligatorio");
      return;
    }
    
    try {
      if (editingSpaceId) {
        // Enforce uniqueness
        const { data: existingSpace } = await supabase
          .from("private_parking_spaces")
          .select("id")
          .eq("parking_lot_id", parkingLotId)
          .eq("space_number", spaceData.space_number.trim())
          .neq("id", editingSpaceId)
          .maybeSingle();

        if (existingSpace) {
          setError("El número de parqueadero ya existe en este contexto.");
          return;
        }

        const { error } = await supabase
          .from("private_parking_spaces")
          .update({
            block: spaceData.block.trim(),
            house_or_apartment: spaceData.house_or_apartment.trim(),
            owner_name: spaceData.owner_name.trim(),
            space_number: spaceData.space_number.trim()
          })
          .eq("id", editingSpaceId);
          
        if (error) throw error;
        setSuccess("Espacio actualizado exitosamente");
      } else {
        // Enforce uniqueness
        const { data: existingSpace } = await supabase
          .from("private_parking_spaces")
          .select("id")
          .eq("parking_lot_id", parkingLotId)
          .eq("space_number", spaceData.space_number.trim())
          .maybeSingle();

        if (existingSpace) {
          setError("El número de parqueadero ya existe en este contexto.");
          return;
        }

        const { error } = await supabase
          .from("private_parking_spaces")
          .insert([{
            parking_lot_id: parkingLotId,
            block: spaceData.block.trim(),
            house_or_apartment: spaceData.house_or_apartment.trim(),
            owner_name: spaceData.owner_name.trim(),
            space_number: spaceData.space_number.trim()
          }]);
          
        if (error) throw error;
        setSuccess("Espacio creado exitosamente");
      }
      
      setSpaceData({ block: "", house_or_apartment: "", owner_name: "", space_number: "" });
      setIsCreating(false);
      setEditingSpaceId(null);
      fetchSpaces();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving space:", err);
      setError(err.message || "Error al guardar el espacio");
    }
  };

  const handleDeleteSpace = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este espacio?")) return;
    
    try {
      const { error } = await supabase
        .from("private_parking_spaces")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      setSuccess("Espacio eliminado exitosamente");
      fetchSpaces();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error deleting space:", err);
      setError(err.message || "Error al eliminar el espacio");
    }
  };

  const handleEditClick = (space: any) => {
    setEditingSpaceId(space.id);
    setSpaceData({
      block: space.block || "",
      house_or_apartment: space.house_or_apartment || "",
      owner_name: space.owner_name || "",
      space_number: space.space_number || ""
    });
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingSpaceId(null);
    setSpaceData({ block: "", house_or_apartment: "", owner_name: "", space_number: "" });
  };

  const filteredSpaces = spaces.filter(space => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (space.space_number && space.space_number.toLowerCase().includes(searchLower)) ||
      (space.owner_name && space.owner_name.toLowerCase().includes(searchLower)) ||
      (space.block && space.block.toLowerCase().includes(searchLower)) ||
      (space.house_or_apartment && space.house_or_apartment.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500"><Spinner size={24} className="mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Parqueaderos Privados</h2>
          <p className="text-sm text-slate-500">Gestiona los espacios asignados a residentes o propietarios</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Espacio
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <X size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">{editingSpaceId ? 'Editar Espacio' : 'Crear Nuevo Espacio'}</h3>
          <form onSubmit={handleSaveSpace} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Parqueadero *</label>
                <input
                  type="text"
                  value={spaceData.space_number}
                  onChange={(e) => setSpaceData({...spaceData, space_number: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. P-101"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Propietario/Residente</label>
                <input
                  type="text"
                  value={spaceData.owner_name}
                  onChange={(e) => setSpaceData({...spaceData, owner_name: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bloque / Torre</label>
                <input
                  type="text"
                  value={spaceData.block}
                  onChange={(e) => setSpaceData({...spaceData, block: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Torre A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Casa / Apartamento</label>
                <input
                  type="text"
                  value={spaceData.house_or_apartment}
                  onChange={(e) => setSpaceData({...spaceData, house_or_apartment: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Apto 301"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editingSpaceId ? 'Actualizar Espacio' : 'Guardar Espacio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-medium text-slate-900">Listado de Espacios</h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar espacios..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          {spaces.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Home size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No hay parqueaderos privados registrados.</p>
              <p className="text-sm text-slate-400 mt-1">Crea espacios para llevar un control de los parqueaderos asignados.</p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No se encontraron espacios que coincidan con &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Parqueadero</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Bloque/Torre</th>
                    <th className="px-4 py-3">Apto/Casa</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpaces.map((space) => (
                    <tr key={space.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{space.space_number}</td>
                      <td className="px-4 py-3 text-slate-600">{space.owner_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{space.block || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{space.house_or_apartment || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(space)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSpace(space.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
