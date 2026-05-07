"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Trash2,
  Save,
  X,
  Home,
  Search,
  Edit2,
  Upload,
  Download,
} from "lucide-react";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { Spinner } from "@/components/ui/Spinner";

import Papa from "papaparse";

export default function PrivateParking({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [configFields, setConfigFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);

  const [spaceData, setSpaceData] = useState({
    space_number: "",
  });

  const [customFieldsData, setCustomFieldsData] = useState<
    Record<string, string>
  >({});

  const fetchSpaces = useCallback(async () => {
    try {
      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("private_custom_fields")
        .eq("id", parkingLotId)
        .single();

      if (lotData) {
        if (lotData.private_custom_fields) {
          setConfigFields(lotData.private_custom_fields);
        }
      }

      const { data, error } = await supabase
        .from("private_parking_spaces")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          setSpaces([]);
          setError(
            "La tabla 'private_parking_spaces' no existe. Por favor, ejecuta el script SQL de actualización.",
          );
        } else {
          try {
            // Intento crear la columna si no existe, o simplemente la ignoramos en el tipado si no usamos RPC
            const { error: columnError } = await supabase.rpc(
              "add_private_fields_column",
            );
          } catch (e) {}
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
            owner_name:
              customFieldsData["Propietario"] ||
              customFieldsData["Propietario/Residente"] ||
              "",
            block:
              customFieldsData["Bloque"] ||
              customFieldsData["Bloque/Torre"] ||
              "",
            house_or_apartment:
              customFieldsData["Apto"] ||
              customFieldsData["Apto/Casa"] ||
              customFieldsData["Apartamento"] ||
              "",
            space_number: spaceData.space_number.trim(),
            custom_fields_data: customFieldsData,
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

        const { error } = await supabase.from("private_parking_spaces").insert([
          {
            parking_lot_id: parkingLotId,
            owner_name:
              customFieldsData["Propietario"] ||
              customFieldsData["Propietario/Residente"] ||
              "",
            block:
              customFieldsData["Bloque"] ||
              customFieldsData["Bloque/Torre"] ||
              "",
            house_or_apartment:
              customFieldsData["Apto"] ||
              customFieldsData["Apto/Casa"] ||
              customFieldsData["Apartamento"] ||
              "",
            space_number: spaceData.space_number.trim(),
            custom_fields_data: customFieldsData,
          },
        ]);

        if (error) throw error;
        setSuccess("Espacio creado exitosamente");
      }

      setSpaceData({ space_number: "" });
      setCustomFieldsData({});
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
      space_number: space.space_number || "",
    });
    setCustomFieldsData(space.custom_fields_data || {});
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingSpaceId(null);
    setSpaceData({ space_number: "" });
    setCustomFieldsData({});
  };

  const handleExportCSV = () => {
    // Generate CSV data from spaces
    const dataToExport = spaces.map((space) => {
      const baseData: any = {
        "Número de Parqueadero": space.space_number || "",
        Propietario: space.owner_name || "",
        Bloque: space.block || "",
        Apartamento: space.house_or_apartment || "",
      };

      // Extract custom fields if available
      if (space.custom_fields_data) {
        configFields.forEach((field) => {
          baseData[field.name] = space.custom_fields_data[field.name] || "";
        });
      }

      return baseData;
    });

    const csvStr = Papa.unparse(dataToExport);
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "parqueaderos_privados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];

          const spacesToUpsert = [];

          for (const row of rows) {
            const spaceNum = row["Número de Parqueadero"];
            if (!spaceNum) continue;

            // Extract custom data logic
            const dynamicFields: Record<string, string> = {};
            configFields.forEach((field) => {
              if (row[field.name] !== undefined) {
                dynamicFields[field.name] = row[field.name];
              }
            });

            spacesToUpsert.push({
              parking_lot_id: parkingLotId,
              space_number: String(spaceNum).trim(),
              block: row["Bloque"] ? String(row["Bloque"]).trim() : "",
              house_or_apartment: row["Apartamento"]
                ? String(row["Apartamento"]).trim()
                : "",
              owner_name: row["Propietario"]
                ? String(row["Propietario"]).trim()
                : "",
              custom_fields_data: dynamicFields,
            });
          }

          // Bulk upsert in chunks to avoid payload size limits
          const chunkSize = 500;
          for (let i = 0; i < spacesToUpsert.length; i += chunkSize) {
            const chunk = spacesToUpsert.slice(i, i + chunkSize);
            const { error: upsertError } = await supabase
              .from("private_parking_spaces")
              .upsert(chunk, {
                onConflict: "parking_lot_id,space_number",
              });

            if (upsertError) throw upsertError;
          }

          setSuccess(
            `Se importaron ${spacesToUpsert.length} parqueaderos correctamente.`,
          );
          fetchSpaces();
        } catch (err: any) {
          setError(`Error importando CSV: ${err.message}`);
        } finally {
          setIsImporting(false);
          // reset input
          e.target.value = "";
        }
      },
      error: (err) => {
        setError("Error leyendo archivo CSV.");
        setIsImporting(false);
      },
    });
  };

  const filteredSpaces = spaces.filter((space) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (space.space_number &&
        space.space_number.toLowerCase().includes(searchLower)) ||
      (space.owner_name &&
        space.owner_name.toLowerCase().includes(searchLower)) ||
      (space.block && space.block.toLowerCase().includes(searchLower)) ||
      (space.house_or_apartment &&
        space.house_or_apartment.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Spinner size={24} className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Parqueaderos Privados
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestiona los espacios asignados a residentes o propietarios
          </p>
        </div>
        {!isCreating && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
              title="Exportar archivo CSV con los datos actuales"
            >
              <Download size={18} />
              Exportar
            </button>
            <label className="flex-1 md:flex-none justify-center cursor-pointer px-4 py-2.5 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
              {isImporting ? <Spinner size={18} /> : <Upload size={18} />}
              Importar
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
                disabled={isImporting}
              />
            </label>
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-200"
            >
              <Plus size={18} />
              Crear Nuevo
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 font-medium text-sm">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      {isCreating && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">
            {editingSpaceId ? "Editar Espacio" : "Crear Nuevo Espacio"}
          </h3>
          <form onSubmit={handleSaveSpace} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Número de Parqueadero *
                </label>
                <input
                  type="text"
                  value={spaceData.space_number}
                  onChange={(e) =>
                    setSpaceData({ ...spaceData, space_number: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                  placeholder="ej. P-101"
                  required
                />
              </div>

              {/* Renderizar campos configurables */}
              {configFields &&
                configFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {field.name} {field.required ? "*" : ""}
                    </label>
                    <input
                      type="text"
                      value={customFieldsData[field.name] || ""}
                      onChange={(e) =>
                        setCustomFieldsData({
                          ...customFieldsData,
                          [field.name]: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                      placeholder={`ej. ${field.name}`}
                      required={field.required}
                    />
                  </div>
                ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-4 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200"
              >
                <Save size={20} />
                {editingSpaceId ? "Actualizar Espacio" : "Guardar Espacio"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isCreating && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Listado de Espacios
            </h3>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar espacios..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 text-slate-900 text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {spaces.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-md">
                <Home size={32} />
              </div>
              <p className="text-slate-900 font-bold text-lg mb-1">
                No hay parqueaderos privados
              </p>
              <p className="text-sm font-medium text-slate-500">
                Crea espacios para llevar un control de los parqueaderos
                asignados.
              </p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              No se encontraron espacios que coincidan con &quot;
              <span className="text-slate-700 font-bold">{searchQuery}</span>
              &quot;.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4 font-bold">Parqueadero</th>
                    {configFields &&
                      configFields.map((cf) => (
                        <th key={cf.name} className="px-5 py-4 font-bold">
                          {cf.name}
                        </th>
                      ))}
                    <th className="px-5 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSpaces.map((space) => (
                    <tr
                      key={space.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                          {space.space_number}
                        </span>
                      </td>
                      {configFields &&
                        configFields.map((cf) => (
                          <td
                            key={cf.name}
                            className="px-5 py-4 text-slate-600 font-medium"
                          >
                            {space.custom_fields_data?.[cf.name] || (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        ))}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(space)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors border border-transparent hover:border-blue-100"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSpace(space.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors border border-transparent hover:border-red-100"
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
