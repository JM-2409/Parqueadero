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
  UserMinus,
} from "lucide-react";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { Spinner } from "@/components/ui/Spinner";
import { sanitizeInput } from "@/lib/sanitize";

import Papa from "papaparse";

export default function PrivateParking({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [configFields, setConfigFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"spaces" | "history">("spaces");

  const [isCreating, setIsCreating] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);

  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

  const [spaceData, setSpaceData] = useState({
    space_number: "",
    vehicle_type: "carros",
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
        // Ordenamiento natural (alfanumérico) en base al space_number en el cliente
        const sortedData = (data || []).sort((a, b) => {
          return String(a.space_number).localeCompare(String(b.space_number), undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
        setSpaces(sortedData);
      }
    } catch (err: any) {
      console.error("Error fetching spaces:", err);
      setError(err.message || "Error al cargar los espacios.");
    } finally {
      setLoading(false);
    }
  }, [parkingLotId]);

  const fetchHistory = useCallback(async () => {
    try {
        const { data, error } = await supabase
            .from("private_parking_history")
            .select("*")
            .eq("parking_lot_id", parkingLotId)
            .order("released_at", { ascending: false });

        if (error) throw error;
        setHistoryRecords(data || []);
    } catch (err: any) {
        console.error("Error fetching history:", err);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchSpaces();
    fetchHistory();
  }, [fetchSpaces, fetchHistory]);

  useEffect(() => {
    if (!parkingLotId) return;

    const channel = supabase
      .channel("public:private_parking_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_parking_spaces",
          filter: `parking_lot_id=eq.${parkingLotId}`,
        },
        () => {
          fetchSpaces();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_parking_history",
          filter: `parking_lot_id=eq.${parkingLotId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parkingLotId, fetchSpaces, fetchHistory]);

  const moveSpaceToHistory = async (space: any) => {
      let plate = "";
      const cf = space.custom_fields_data || {};

      const mainField = configFields.find(f => f.is_main)?.name;
      if (mainField && cf[mainField]) {
          plate = cf[mainField];
      } else {
          const plateKey = Object.keys(cf).find(k => k.toLowerCase() === 'placa');
          if (plateKey) plate = cf[plateKey];
      }

      if (plate) {
        // Borramos cualquier registro en historial previo de este vehículo
        await supabase
          .from("private_parking_history")
          .delete()
          .eq("parking_lot_id", parkingLotId)
          .eq("plate", plate);
      }

      const { error: historyError } = await supabase
        .from("private_parking_history")
        .insert({
          parking_lot_id: parkingLotId,
          plate: plate,
          owner_name: space.owner_name,
          custom_fields_data: space.custom_fields_data,
          vehicle_type: space.vehicle_type
        });

      if (historyError) throw historyError;
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!spaceData.space_number.trim()) {
      setError("El número de parqueadero es obligatorio");
      return;
    }

    try {
      // 1. Identificamos si hay una placa en los datos para buscarla en el historial y eliminarla.
      let plateEntered = "";
      const mainField = configFields.find(f => f.is_main)?.name;
      if (mainField && customFieldsData[mainField]) {
          plateEntered = customFieldsData[mainField];
      } else {
          const plateKey = Object.keys(customFieldsData).find(k => k.toLowerCase() === 'placa');
          if (plateKey) plateEntered = customFieldsData[plateKey];
      }

      if (plateEntered) {
        const plateUpper = plateEntered.toUpperCase();
        const duplicateSpace = spaces.find(space => {
          if (editingSpaceId && space.id === editingSpaceId) return false;
          const cf = space.custom_fields_data || {};
          const spacePlate = (mainField && cf[mainField]) || (Object.keys(cf).find(k => k.toLowerCase() === 'placa') ? cf[Object.keys(cf).find(k => k.toLowerCase() === 'placa')!] : "");
          return spacePlate && spacePlate.toUpperCase() === plateUpper;
        });

        if (duplicateSpace) {
          setError(`El vehículo con placa ${plateUpper} ya está registrado en el parqueadero ${duplicateSpace.space_number}.`);
          return;
        }
      }

      if (plateEntered) {
        // Borramos del historial si vuelve a los activos
        await supabase
          .from("private_parking_history")
          .delete()
          .eq("parking_lot_id", parkingLotId)
          .eq("plate", plateEntered);
      }

      if (editingSpaceId) {
        // Enforce uniqueness / Check if moving to existing
        const { data: existingSpace } = await supabase
          .from("private_parking_spaces")
          .select("*")
          .eq("parking_lot_id", parkingLotId)
          .eq("space_number", spaceData.space_number.trim())
          .neq("id", editingSpaceId)
          .maybeSingle();

        if (existingSpace) {
            const hasData = existingSpace.custom_fields_data && Object.keys(existingSpace.custom_fields_data).length > 0;
            if (hasData) {
               const confirmSwap = confirm(`El espacio ${spaceData.space_number.trim()} ya está ocupado. ¿Deseas hacer el cambio? El vehículo que ocupaba este espacio pasará al historial.`);
               if (!confirmSwap) return;

               await moveSpaceToHistory(existingSpace);

               // Delete old row we were editing, since we move to existingSpace
               await supabase.from("private_parking_spaces").delete().eq("id", editingSpaceId);

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
                    custom_fields_data: customFieldsData,
                    vehicle_type: spaceData.vehicle_type,
                  })
                  .eq("id", existingSpace.id);
               if (error) throw error;
               setSuccess("Espacio reasignado exitosamente.");
            } else {
               // Update empty existing space and delete old
               await supabase.from("private_parking_spaces").delete().eq("id", editingSpaceId);
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
                    custom_fields_data: customFieldsData,
                    vehicle_type: spaceData.vehicle_type,
                  })
                  .eq("id", existingSpace.id);
               if (error) throw error;
               setSuccess("Espacio guardado exitosamente.");
            }
        } else {
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
                vehicle_type: spaceData.vehicle_type,
              })
              .eq("id", editingSpaceId);

            if (error) throw error;
            setSuccess("Espacio actualizado exitosamente.");
        }
      } else {
        // Creating new space but it might already exist
        const { data: existingSpace } = await supabase
          .from("private_parking_spaces")
          .select("*")
          .eq("parking_lot_id", parkingLotId)
          .eq("space_number", spaceData.space_number.trim())
          .maybeSingle();

        if (existingSpace) {
            const hasData = existingSpace.custom_fields_data && Object.keys(existingSpace.custom_fields_data).length > 0;
            if (hasData) {
               const confirmSwap = confirm(`El espacio ${spaceData.space_number.trim()} ya existe y está ocupado. ¿Deseas reasignarlo? El vehículo que lo ocupaba pasará al historial.`);
               if (!confirmSwap) return;

               await moveSpaceToHistory(existingSpace);

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
                    custom_fields_data: customFieldsData,
                    vehicle_type: spaceData.vehicle_type,
                  })
                  .eq("id", existingSpace.id);
               if (error) throw error;
               setSuccess("Espacio reasignado exitosamente.");
            } else {
               // Update empty existing space
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
                    custom_fields_data: customFieldsData,
                    vehicle_type: spaceData.vehicle_type,
                  })
                  .eq("id", existingSpace.id);
               if (error) throw error;
               setSuccess("Espacio guardado exitosamente.");
            }
        } else {
            const { error } = await supabase.from("private_parking_spaces").insert([
              {
                parking_lot_id: parkingLotId,
                owner_name: sanitizeInput(
                  customFieldsData["Propietario"] ||
                  customFieldsData["Propietario/Residente"] ||
                  ""
                ),
                block: sanitizeInput(
                  customFieldsData["Bloque"] ||
                  customFieldsData["Bloque/Torre"] ||
                  ""
                ),
                house_or_apartment: sanitizeInput(
                  customFieldsData["Apto"] ||
                  customFieldsData["Apto/Casa"] ||
                  customFieldsData["Apartamento"] ||
                  ""
                ),
                space_number: sanitizeInput(spaceData.space_number.trim()),
                custom_fields_data: customFieldsData,
                vehicle_type: sanitizeInput(spaceData.vehicle_type),
              },
            ]);

            if (error) throw error;
            setSuccess("Espacio creado exitosamente.");
        }
      }

      setSpaceData({ space_number: "", vehicle_type: "carros" });
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

  const handleDeleteSpace = async (space: any) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este espacio?")) return;

    try {
      // Si el espacio tiene datos, lo movemos al historial primero
      const hasData = space.custom_fields_data && Object.keys(space.custom_fields_data).length > 0;
      if (hasData) {
         await moveSpaceToHistory(space);
      }

      const { error } = await supabase
        .from("private_parking_spaces")
        .delete()
        .eq("id", space.id);

      if (error) throw error;

      setSuccess("Espacio eliminado exitosamente");
      fetchSpaces();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error deleting space:", err);
      setError(err.message || "Error al eliminar el espacio");
    }
  };

  const handleReleaseSpace = async (space: any) => {
    if (!confirm(`¿Estás seguro de que deseas liberar el parqueadero ${space.space_number} y pasarlo al historial?`)) return;

    try {
      // 1. Get the plate (case insensitive check for Placa key in custom_fields)
      let plate = "";
      const cf = space.custom_fields_data || {};
      const plateKey = Object.keys(cf).find(k => k.toLowerCase() === 'placa');
      if (plateKey) plate = cf[plateKey];

      if (plate) {
        // Borramos cualquier registro en historial previo de este vehículo
        await supabase
          .from("private_parking_history")
          .delete()
          .eq("parking_lot_id", parkingLotId)
          .eq("plate", plate);
      }

      // 2. Insert into history
      const { error: historyError } = await supabase
        .from("private_parking_history")
        .insert({
          parking_lot_id: parkingLotId,
          plate: plate,
          owner_name: space.owner_name,
          custom_fields_data: space.custom_fields_data,
          vehicle_type: space.vehicle_type
        });

      if (historyError) throw historyError;

      // 3. Clear data from space, keeping only space_number
      const { error: updateError } = await supabase
        .from("private_parking_spaces")
        .update({
          owner_name: null,
          block: null,
          house_or_apartment: null,
          custom_fields_data: {}
        })
        .eq("id", space.id);

      if (updateError) throw updateError;

      setSuccess(`Parqueadero ${space.space_number} liberado exitosamente.`);
      fetchSpaces();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error releasing space:", err);
      setError(err.message || "Error al liberar el espacio");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedSpaces.length) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar los ${selectedSpaces.length} espacios seleccionados?`)) return;

    setSuccess("");
    setError("");

    try {
      // Find the full space objects for the selected IDs
      const spacesToDelete = spaces.filter(s => selectedSpaces.includes(s.id));

      // Move any occupied spaces to history first
      for (const space of spacesToDelete) {
          const hasData = space.custom_fields_data && Object.keys(space.custom_fields_data).length > 0;
          if (hasData) {
             await moveSpaceToHistory(space);
          }
      }

      // Delete in batches of 500
      for (let i = 0; i < selectedSpaces.length; i += 500) {
        const chunk = selectedSpaces.slice(i, i + 500);
        const { error } = await supabase
          .from("private_parking_spaces")
          .delete()
          .in("id", chunk);

        if (error) throw error;
      }

      setSuccess(`Se eliminaron ${selectedSpaces.length} espacios exitosamente.`);
      setSelectedSpaces([]);
      fetchSpaces();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error bulk deleting spaces:", err);
      setError(err.message || "Error al eliminar los espacios seleccionados");
    }
  };

  const toggleSelection = (spaceId: string) => {
    setSelectedSpaces(prev =>
      prev.includes(spaceId)
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const toggleSelectAll = (spacesList: any[]) => {
    const allIds = spacesList.map(s => s.id);
    const areAllSelected = allIds.every(id => selectedSpaces.includes(id));

    if (areAllSelected) {
      setSelectedSpaces(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedSpaces(prev => {
        const newSelection = new Set([...prev, ...allIds]);
        return Array.from(newSelection);
      });
    }
  };

  const handleEditClick = (space: any) => {
    setEditingSpaceId(space.id);
    setSpaceData({
      space_number: space.space_number || "",
      vehicle_type: space.vehicle_type || "carros",
    });
    setCustomFieldsData(space.custom_fields_data || {});
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSpaceNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSpaceData({ ...spaceData, space_number: value });
  };

  const handleVehicleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpaceData({ ...spaceData, vehicle_type: e.target.value });
  };

  const handleSearchHistoryForPlate = async (fieldValue: string, fieldName: string) => {
    if (fieldValue.length >= 3) {
        const plateUpper = fieldValue.toUpperCase();
        let foundData: any = null;
        let sourceMessage = "activos";

        // 1. Check in local active private spaces first
        const activeSpace = spaces.find(space => {
            if (editingSpaceId && space.id === editingSpaceId) return false;
            const cf = space.custom_fields_data || {};
            const spacePlate = cf[fieldName] || (Object.keys(cf).find(k => k.toLowerCase() === 'placa') ? cf[Object.keys(cf).find(k => k.toLowerCase() === 'placa')!] : "");
            return spacePlate && typeof spacePlate === 'string' && spacePlate.toUpperCase() === plateUpper;
        });

        if (activeSpace) {
            foundData = activeSpace.custom_fields_data || {};
        }

        // 2. Check in public vehicles if not found in active spaces
        if (!foundData) {
            const { data: vehicleData } = await supabase
                .from("vehicles")
                .select("*")
                .eq("parking_lot_id", parkingLotId)
                .eq("plate", plateUpper)
                .eq("status", "active")
                .order("entry_time", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (vehicleData) {
                foundData = vehicleData.custom_fields_data || {};
                sourceMessage = "vehículos activos";
            }
        }

        // 3. Check in history if not found in active spaces or vehicles
        if (!foundData) {
            // Since custom_fields_data is JSONB, we need to query if the value exists
            // Also fallback to "plate" column if the field happens to be named "Placa" or similar
            const { data: historyData } = await supabase
            .from("private_parking_history")
            .select("*")
            .eq("parking_lot_id", parkingLotId)
            .or(`plate.eq.${plateUpper},custom_fields_data->>${fieldName}.ilike.${fieldValue}`)
            .order("released_at", { ascending: false })
            .limit(1)
            .maybeSingle();

            if (historyData) {
                foundData = historyData.custom_fields_data || {};
                sourceMessage = "del historial";
            }
        }

        if (foundData) {
            const cf = foundData;
            setCustomFieldsData(prev => {
                // Solo autocompletar campos vacíos, no sobreescribir si ya tienen datos
                const newData = { ...prev };
                let merged = false;
                Object.keys(cf).forEach(k => {
                    if (!newData[k] && k !== fieldName) {
                        newData[k] = cf[k];
                        merged = true;
                    }
                });

                if (merged && !success) {
                   setSuccess(`Se autocompletaron datos ${sourceMessage} para ${plateUpper}`);
                   setTimeout(() => setSuccess(""), 3000);
                }
                return newData;
            });
        }
    }
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingSpaceId(null);
    setSpaceData({ space_number: "", vehicle_type: "carros" });
    setCustomFieldsData({});
  };

  const handleExportCSV = () => {
    // Generate CSV data from spaces
    const fields = [
      "Número de Parqueadero",
      "Tipo de Vehículo",
      ...configFields.map((f) => f.name),
    ];

    const dataToExport = spaces.map((space) => {
      const baseData: any = {
        "Número de Parqueadero": space.space_number || "",
        "Tipo de Vehículo": space.vehicle_type === 'motos' ? 'Moto' : 'Carro',
      };

      // Extract custom fields if available
      if (space.custom_fields_data) {
        configFields.forEach((field) => {
          baseData[field.name] = space.custom_fields_data[field.name] || "";
        });
      }

      return baseData;
    });

    const csvStr = Papa.unparse({ fields, data: dataToExport });
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

            let vehicle_type = "carros";

            // Check explicit column first if provided
            if (row["Tipo de Vehículo"]) {
              const tv = String(row["Tipo de Vehículo"]).toLowerCase().trim();
              if (tv.includes("moto")) vehicle_type = "motos";
            } else {
              // Automatically infer vehicle type from space number if "Tipo de Vehículo" column is missing
              const sn = String(spaceNum).trim().toLowerCase();
              if (sn.startsWith("m")) {
                vehicle_type = "motos";
              } else if (sn.startsWith("c")) {
                vehicle_type = "carros";
              }
            }

            spacesToUpsert.push({
              parking_lot_id: parkingLotId,
              space_number: String(spaceNum).trim(),
              block: "",
              house_or_apartment: "",
              owner_name: "",
              custom_fields_data: dynamicFields,
              vehicle_type: vehicle_type,
            });
          }

          // Retrieve existing spaces to avoid onConflict constraint error
          const { data: existingSpaces } = await supabase
            .from("private_parking_spaces")
            .select("*")
            .eq("parking_lot_id", parkingLotId);

          const existingMap = new Map();
          if (existingSpaces) {
            existingSpaces.forEach(s => existingMap.set(String(s.space_number).trim(), s.id));
          }

          // Separate records into inserts and updates to avoid id null constraint errors
          const recordsToInsert = [];
          const recordsToUpdate = [];

          const spacesToArchive = [];

          // Handle spaces that are not in the CSV anymore (Opción A)
          const incomingSpaceNumbers = new Set(spacesToUpsert.map(s => s.space_number));

          if (existingSpaces) {
            for (const space of existingSpaces) {
              if (!incomingSpaceNumbers.has(String(space.space_number).trim())) {
                // Releasing space (moves to history and clears data)
                const hasData = space.custom_fields_data && Object.keys(space.custom_fields_data).length > 0;
                if (hasData) {
                  spacesToArchive.push(space);
                  recordsToUpdate.push({
                    id: space.id,
                    parking_lot_id: parkingLotId,
                    space_number: space.space_number,
                    vehicle_type: space.vehicle_type || "carros",
                    owner_name: null,
                    block: null,
                    house_or_apartment: null,
                    custom_fields_data: {}
                  });
                }
              }
            }
          }

          for (const s of spacesToUpsert) {
            const existingSpace = existingSpaces?.find(
              (es) => String(es.space_number).trim() === String(s.space_number).trim()
            );

            if (existingSpace) {
              // If the space already exists and has data, and we are importing new data,
              // we should move the existing data to history first.
              const hasData = existingSpace.custom_fields_data && Object.keys(existingSpace.custom_fields_data).length > 0;

              if (hasData) {
                  spacesToArchive.push(existingSpace);
              }

              // Only include exactly the columns being updated to avoid Supabase bulk upsert heterogeneous object errors
              recordsToUpdate.push({
                  id: existingSpace.id,
                  parking_lot_id: parkingLotId,
                  space_number: s.space_number,
                  block: s.block || "",
                  house_or_apartment: s.house_or_apartment || "",
                  owner_name: s.owner_name || "",
                  custom_fields_data: s.custom_fields_data || {},
                  vehicle_type: s.vehicle_type || "carros"
              });
            } else {
              recordsToInsert.push(s);
            }
          }

          // 1. Process batch archives (History) to avoid fetch timeout from individual queries
          if (spacesToArchive.length > 0) {
            const historyRecordsToInsert = spacesToArchive.map(space => {
              let plate = "";
              const cf = space.custom_fields_data || {};
              const mainField = configFields.find(f => f.is_main)?.name;
              if (mainField && cf[mainField]) {
                  plate = cf[mainField];
              } else {
                  const plateKey = Object.keys(cf).find(k => k.toLowerCase() === 'placa');
                  if (plateKey) plate = cf[plateKey];
              }

              return {
                parking_lot_id: parkingLotId,
                plate: plate,
                owner_name: space.owner_name,
                custom_fields_data: space.custom_fields_data,
                vehicle_type: space.vehicle_type
              };
            });

            // Insert new history records in chunks of 500
            // Since we aren't enforcing a strict unique constraint on plate in history globally,
            // we can safely insert new records without deleting previous ones. This preserves
            // the full historical record over time while moving them to history in batch.
            for (let i = 0; i < historyRecordsToInsert.length; i += 500) {
               const chunk = historyRecordsToInsert.slice(i, i + 500);
               const { error: histErr } = await supabase.from("private_parking_history").insert(chunk);
               if (histErr) throw histErr;
            }
          }

          const chunkSize = 500;

          // Process Inserts
          for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
            const chunk = recordsToInsert.slice(i, i + chunkSize);
            const { error: insertError } = await supabase
              .from("private_parking_spaces")
              .insert(chunk);

            if (insertError) throw insertError;
          }

          // Process Updates (upsert works fine when all records have an id)
          for (let i = 0; i < recordsToUpdate.length; i += chunkSize) {
            const chunk = recordsToUpdate.slice(i, i + chunkSize);
            const { error: updateError } = await supabase
              .from("private_parking_spaces")
              .upsert(chunk);

            if (updateError) throw updateError;
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

    // Check main fields
    let matches = (space.space_number && space.space_number.toLowerCase().includes(searchLower)) ||
      (space.owner_name && space.owner_name.toLowerCase().includes(searchLower)) ||
      (space.block && space.block.toLowerCase().includes(searchLower)) ||
      (space.house_or_apartment && space.house_or_apartment.toLowerCase().includes(searchLower));

    // Check custom fields values
    if (!matches && space.custom_fields_data) {
        matches = Object.values(space.custom_fields_data).some((val: any) =>
            String(val).toLowerCase().includes(searchLower)
        );
    }

    return matches;
  });

  const filteredHistory = historyRecords.filter((record) => {
    const searchLower = searchQuery.toLowerCase();

    let matches = (record.plate && record.plate.toLowerCase().includes(searchLower)) ||
      (record.owner_name && record.owner_name.toLowerCase().includes(searchLower));

    if (!matches && record.custom_fields_data) {
        matches = Object.values(record.custom_fields_data).some((val: any) =>
            String(val).toLowerCase().includes(searchLower)
        );
    }

    return matches;
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
          <p className="text-sm font-bold text-slate-500 mt-1">
            Gestiona los espacios asignados a residentes o propietarios
          </p>
        </div>
        {!isCreating && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none justify-center px-5 py-3.5 bg-white text-slate-700 border-2 border-slate-100 rounded-3xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-3"
              title="Exportar archivo CSV con los datos actuales"
            >
              <Download size={18} />
              Exportar
            </button>
            <label className="flex-1 md:flex-none justify-center cursor-pointer px-5 py-3.5 bg-white text-slate-700 border-2 border-slate-100 rounded-3xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-3">
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
              className="flex-1 md:flex-none justify-center px-5 py-3.5 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-3 shadow-xl border border-slate-100 shadow-slate-200"
            >
              <Plus size={18} />
              Crear Nuevo
            </button>
          </div>
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
          <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">
            {editingSpaceId ? "Editar Espacio" : "Crear Nuevo Espacio"}
          </h3>
          <form onSubmit={handleSaveSpace} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Número de Parqueadero *
                </label>
                <input
                  type="text"
                  value={spaceData.space_number}
                  onChange={handleSpaceNumberChange}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                  placeholder="ej. P-101"
                  required
                />
              </div>

              {/* Tipo de Vehículo */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Vehículo
                </label>
                <select
                  value={spaceData.vehicle_type}
                  onChange={handleVehicleTypeChange}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                >
                  <option value="carros">Carro</option>
                  <option value="motos">Moto</option>
                </select>
              </div>

              {/* Renderizar campos configurables */}
              {configFields &&
                configFields.map((field) => {
                  const isPlate = field.name.toLowerCase().includes('placa');
                  const isMainField = field.is_main === true;
                  return (
                  <div key={field.name}>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      {field.name} {field.required ? "*" : ""}
                    </label>
                    <input
                      type="text"
                      value={customFieldsData[field.name] || ""}
                      onChange={(e) => {
                        const val = isPlate || isMainField ? e.target.value.toUpperCase() : e.target.value;
                        setCustomFieldsData({
                          ...customFieldsData,
                          [field.name]: val,
                        });
                        if (isMainField && val.length >= 3) {
                            handleSearchHistoryForPlate(val, field.name);
                        } else if (!configFields.some(f => f.is_main) && isPlate && val.length >= 5) {
                            handleSearchHistoryForPlate(val, field.name);
                        }
                      }}
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                      placeholder={`ej. ${field.name}`}
                      required={field.required}
                    />
                  </div>
                )})}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-4 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-700 rounded-3xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 shadow-xl border border-slate-100 shadow-slate-200"
              >
                <Save size={20} />
                {editingSpaceId ? "Actualizar Espacio" : "Guardar Espacio"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isCreating && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center bg-slate-100 p-1 rounded-3xl">
                <button
                  onClick={() => {
                    setActiveTab("spaces");
                    setSelectedSpaces([]);
                  }}
                  className={`px-4 py-2 rounded-3xl text-sm font-bold transition-colors ${
                    activeTab === "spaces"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Espacios Activos
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history");
                    setSelectedSpaces([]);
                  }}
                  className={`px-4 py-2 rounded-3xl text-sm font-bold transition-colors ${
                    activeTab === "history"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Historial
                </button>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === "spaces" ? "Buscar espacios..." : "Buscar historial..."}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {activeTab === "spaces" ? (
            <>
              {selectedSpaces.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-between">
                  <span className="text-red-700 font-bold text-sm">
                    {selectedSpaces.length} espacio(s) seleccionado(s)
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 bg-red-500 text-white rounded-3xl text-sm font-bold shadow-md hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Eliminar Seleccionados
                  </button>
                </div>
              )}

              {spaces.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xl border border-slate-100">
                <Home size={32} />
              </div>
              <p className="text-slate-900 font-bold text-lg mb-1">
                No hay parqueaderos privados
              </p>
              <p className="text-sm font-bold text-slate-500">
                Crea espacios para llevar un control de los parqueaderos
                asignados.
              </p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
              No se encontraron espacios que coincidan con &quot;
              <span className="text-slate-700 font-bold">{searchQuery}</span>
              &quot;.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Carros Table */}
              {filteredSpaces.filter((s) => s.vehicle_type !== 'motos').length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Carros</h4>
                  <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-4 font-bold w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                              checked={
                                filteredSpaces.filter(s => s.vehicle_type !== 'motos').length > 0 &&
                                filteredSpaces.filter(s => s.vehicle_type !== 'motos').every(s => selectedSpaces.includes(s.id))
                              }
                              onChange={() => toggleSelectAll(filteredSpaces.filter(s => s.vehicle_type !== 'motos'))}
                            />
                          </th>
                          <th className="px-5 py-4 font-bold">Parqueadero</th>
                          {configFields &&
                            configFields.map((cf) => (
                              <th key={`car-${cf.name}`} className="px-5 py-4 font-bold">
                                {cf.name}
                              </th>
                            ))}
                          <th className="px-5 py-4 font-bold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredSpaces
                          .filter((s) => s.vehicle_type !== 'motos')
                          .map((space) => (
                          <tr
                            key={space.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                checked={selectedSpaces.includes(space.id)}
                                onChange={() => toggleSelection(space.id)}
                              />
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-3xl inline-block">
                                {space.space_number}
                              </span>
                            </td>
                            {configFields &&
                              configFields.map((cf) => (
                                <td
                                  key={`car-${cf.name}-${space.id}`}
                                  className="px-5 py-4 text-slate-600 font-bold"
                                >
                                  {space.custom_fields_data?.[cf.name] || (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              ))}
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(space)}
                                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-indigo-50 rounded-3xl transition-colors border border-transparent hover:border-indigo-100"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleReleaseSpace(space)}
                                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-orange-50 rounded-3xl transition-colors border border-transparent hover:border-orange-100"
                                  title="Liberar Parqueadero (Pasar al historial)"
                                >
                                  <UserMinus size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSpace(space)}
                                  className="p-3 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-all border border-transparent shadow-md border border-slate-100 hover:shadow-xl border border-slate-100 active:scale-95"
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
                </div>
              )}

              {/* Motos Table */}
              {filteredSpaces.filter((s) => s.vehicle_type === 'motos').length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Motos</h4>
                  <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-4 font-bold w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                              checked={
                                filteredSpaces.filter(s => s.vehicle_type === 'motos').length > 0 &&
                                filteredSpaces.filter(s => s.vehicle_type === 'motos').every(s => selectedSpaces.includes(s.id))
                              }
                              onChange={() => toggleSelectAll(filteredSpaces.filter(s => s.vehicle_type === 'motos'))}
                            />
                          </th>
                          <th className="px-5 py-4 font-bold">Parqueadero</th>
                          {configFields &&
                            configFields.map((cf) => (
                              <th key={`moto-${cf.name}`} className="px-5 py-4 font-bold">
                                {cf.name}
                              </th>
                            ))}
                          <th className="px-5 py-4 font-bold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredSpaces
                          .filter((s) => s.vehicle_type === 'motos')
                          .map((space) => (
                          <tr
                            key={space.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                checked={selectedSpaces.includes(space.id)}
                                onChange={() => toggleSelection(space.id)}
                              />
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-3xl inline-block">
                                {space.space_number}
                              </span>
                            </td>
                            {configFields &&
                              configFields.map((cf) => (
                                <td
                                  key={`moto-${cf.name}-${space.id}`}
                                  className="px-5 py-4 text-slate-600 font-bold"
                                >
                                  {space.custom_fields_data?.[cf.name] || (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              ))}
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(space)}
                                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-indigo-50 rounded-3xl transition-colors border border-transparent hover:border-indigo-100"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleReleaseSpace(space)}
                                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-orange-50 rounded-3xl transition-colors border border-transparent hover:border-orange-100"
                                  title="Liberar Parqueadero (Pasar al historial)"
                                >
                                  <UserMinus size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSpace(space)}
                                  className="p-3 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-all border border-transparent shadow-md border border-slate-100 hover:shadow-xl border border-slate-100 active:scale-95"
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
                </div>
              )}
            </div>
          )}
            </>
          ) : (
            <>
              {historyRecords.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                  <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xl border border-slate-100">
                    <Search size={32} />
                  </div>
                  <p className="text-slate-900 font-bold text-lg mb-1">
                    Historial vacío
                  </p>
                  <p className="text-sm font-bold text-slate-500">
                    Aún no hay registros de vehículos que hayan liberado su parqueadero.
                  </p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                  No se encontraron registros en el historial que coincidan con &quot;
                  <span className="text-slate-700 font-bold">{searchQuery}</span>
                  &quot;.
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Carros History Table */}
                  {filteredHistory.filter((r) => r.vehicle_type !== 'motos').length > 0 && (
                    <div>
                      <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Carros</h4>
                      <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-4 font-bold">Placa/Principal</th>
                              {configFields &&
                                configFields.map((cf) => (
                                  <th key={`hist-car-${cf.name}`} className="px-5 py-4 font-bold">
                                    {cf.name}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredHistory
                              .filter((r) => r.vehicle_type !== 'motos')
                              .map((record) => (
                              <tr
                                key={record.id}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-5 py-4">
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-3xl inline-block">
                                    {record.plate || "N/A"}
                                  </span>
                                </td>
                                {configFields &&
                                  configFields.map((cf) => (
                                    <td
                                      key={`hist-car-data-${cf.name}-${record.id}`}
                                      className="px-5 py-4 text-slate-600 font-bold"
                                    >
                                      {record.custom_fields_data?.[cf.name] || (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Motos History Table */}
                  {filteredHistory.filter((r) => r.vehicle_type === 'motos').length > 0 && (
                    <div>
                      <h4 className="text-md font-bold text-slate-800 mb-4 px-2">Motos</h4>
                      <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-4 font-bold">Placa/Principal</th>
                              {configFields &&
                                configFields.map((cf) => (
                                  <th key={`hist-moto-${cf.name}`} className="px-5 py-4 font-bold">
                                    {cf.name}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredHistory
                              .filter((r) => r.vehicle_type === 'motos')
                              .map((record) => (
                              <tr
                                key={record.id}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-5 py-4">
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-3xl inline-block">
                                    {record.plate || "N/A"}
                                  </span>
                                </td>
                                {configFields &&
                                  configFields.map((cf) => (
                                    <td
                                      key={`hist-moto-data-${cf.name}-${record.id}`}
                                      className="px-5 py-4 text-slate-600 font-bold"
                                    >
                                      {record.custom_fields_data?.[cf.name] || (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
