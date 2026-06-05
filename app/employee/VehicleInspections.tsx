"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Camera, Save, X, ImageIcon, Loader2, PlayCircle, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { v4 as uuidv4 } from "uuid";

export default function VehicleInspections({
  parkingLot,
  profile,
}: {
  parkingLot: any;
  profile: any;
}) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Inspection Session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inspectedPlates, setInspectedPlates] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // Form states
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = parkingLot?.inspection_settings || { require_photos: false, require_notes: false, enabled: true };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      // Fetch active parking sessions (Visitors)
      const { data: activeSessions, error: err1 } = await supabase
        .from("parking_sessions")
        .select("id, vehicle_id, vehicles(plate, type)")
        .eq("parking_lot_id", parkingLot.id)
        .eq("status", "active");

      // Fetch private parking spaces
      const { data: privateSpaces, error: err2 } = await supabase
        .from("private_parking_spaces")
        .select("id, space_number, vehicle_type, custom_fields_data")
        .eq("parking_lot_id", parkingLot.id);

      if (err1) throw err1;
      if (err2) throw err2;

      const combined = [];

      // Map visitors
      if (activeSessions) {
        activeSessions.forEach((session: any) => {
          if (session.vehicles) {
            combined.push({
              id: session.id,
              plate: session.vehicles.plate,
              type: "visitor",
              label: "Visitante",
              sortKey: "ZZZZZ" // Visitantes al final
            });
          }
        });
      }

      // Map private spaces (looking for main 'placa' field)
      if (privateSpaces) {
        privateSpaces.forEach((space: any) => {
          let plate = "";
          if (space.custom_fields_data) {
             const plateKey = Object.keys(space.custom_fields_data).find(k => k.toLowerCase().includes('placa'));
             if (plateKey) plate = space.custom_fields_data[plateKey];
          }
          if (plate) {
            combined.push({
              id: space.id,
              plate: plate.toUpperCase(),
              type: "private",
              label: `Privado (${space.space_number})`,
              sortKey: String(space.space_number).padStart(10, '0') // Padding for correct alphanumeric sorting
            });
          }
        });
      }

      // Sort by private space number first, visitors at the end
      combined.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      setVehicles(combined);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    setSessionId(uuidv4());
    setInspectedPlates([]);
    setIsFinished(false);
    setSuccess("");
    await fetchVehicles();
  };

  const endSession = () => {
    setSessionId(null);
    setInspectedPlates([]);
    setSelectedVehicle(null);
    setIsFinished(true);
    setVehicles([]);
    setSuccess("Revista finalizada.");
    setTimeout(() => {
        setIsFinished(false);
        setSuccess("");
    }, 5000);
  };

  // Image resizing function to prevent FileReader crash on large mobile photos
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Cannot get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.5));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 6) {
      setError("Máximo 6 imágenes por revista.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const base64data = await resizeImage(file);

      const res = await fetch("/api/upload-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64data }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");

      setImages((prev) => [...prev, data.secure_url]);

    } catch (err: any) {
      setError(err.message || "Error al procesar la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    if (settings.require_notes && !notes.trim()) {
      setError("Las observaciones son obligatorias según configuración.");
      return;
    }

    if (settings.require_photos && images.length === 0) {
      setError("Se requiere al menos una foto según configuración.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { error: insertError } = await supabase
        .from("vehicle_inspections")
        .insert({
          parking_lot_id: parkingLot.id,
          employee_id: profile.id,
          employee_name: profile.email,
          vehicle_type: selectedVehicle.type,
          plate: selectedVehicle.plate,
          notes: notes.trim() || null,
          images: images,
          session_id: selectedVehicle?.type === 'visitor' ? sessionId : null // Only for visitors
        });

      if (insertError) {
          // If the column session_id doesn't exist yet, we can catch it and retry without it
          // Or log it. We expect the SQL script to have been run.
          if (insertError.code === '42703') {
             const { error: retryError } = await supabase
                .from("vehicle_inspections")
                .insert({
                  parking_lot_id: parkingLot.id,
                  employee_id: profile.id,
                  employee_name: profile.email,
                  vehicle_type: selectedVehicle.type,
                  plate: selectedVehicle.plate,
                  notes: notes.trim() || null,
                  images: images,
                });
             if (retryError) throw retryError;
          } else {
             throw insertError;
          }
      }

      setSuccess(`Revista guardada para el vehículo ${selectedVehicle.plate}`);
      setTimeout(() => setSuccess(""), 3000);

      // Add to inspected plates to remove from list
      setInspectedPlates(prev => [...prev, selectedVehicle.plate]);

      // Reset form
      setSelectedVehicle(null);
      setNotes("");
      setImages([]);

    } catch (err: any) {
      setError(err.message || "Error al guardar la revista.");
    } finally {
      setSaving(false);
    }
  };

  const pendingVehicles = useMemo(() => {
    return vehicles.filter(v => !inspectedPlates.includes(v.plate));
  }, [vehicles, inspectedPlates]);

  const filteredVehicles = pendingVehicles.filter(v =>
    v.plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Effect to automatically end session if all vehicles are inspected
  useEffect(() => {
      if (sessionId && pendingVehicles.length === 0 && vehicles.length > 0) {
          endSession();
      }
  }, [pendingVehicles, sessionId, vehicles]);

  if (!settings.enabled) {
    return (
       <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl">
         <p className="text-slate-500 font-bold">Las revistas están deshabilitadas en la configuración del parqueadero.</p>
       </div>
    );
  }

  if (loading && !sessionId) return <div className="text-center py-8"><Spinner size={24} className="mx-auto" /></div>;

  if (!sessionId) {
      return (
          <div className="space-y-6">
             {success && <SuccessMessage message={success} />}
             <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center min-h-[400px]">
                 {isFinished ? (
                     <>
                        <CheckCircle className="text-green-500 w-24 h-24 mb-6" />
                        <h2 className="text-3xl font-black text-slate-900 mb-2">¡Revista Finalizada!</h2>
                        <p className="text-slate-500 font-bold mb-8">Todos los vehículos en el parqueadero han sido revisados.</p>
                     </>
                 ) : (
                     <>
                        <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                            <Camera size={48} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Comenzar Revista</h2>
                        <p className="text-slate-500 font-bold mb-8 max-w-md">
                            Inicia un nuevo recorrido para tomar las evidencias y observaciones de los vehículos que se encuentran actualmente en el parqueadero.
                        </p>
                     </>
                 )}

                 <button
                     onClick={startSession}
                     disabled={loading}
                     className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 shadow-xl border border-slate-100 shadow-slate-200 text-lg disabled:opacity-50"
                 >
                     {loading ? <Spinner size={24} /> : <PlayCircle size={24} />}
                     {isFinished ? "Iniciar Nueva Revista" : "Iniciar Revista"}
                 </button>
             </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {success && <SuccessMessage message={success} />}

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row gap-6">
        {/* Left Col: Vehicle Selection */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-slate-100 pr-0 md:pr-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Pendientes ({pendingVehicles.length})</h3>
            <button
               onClick={endSession}
               className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
            >
               Terminar
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-0 text-sm text-slate-900 rounded-3xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold placeholder:font-normal"
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-2">
            {filteredVehicles.length === 0 ? (
              <p className="text-center text-slate-500 text-sm mt-4 font-bold">No hay vehículos.</p>
            ) : (
              filteredVehicles.map(v => (
                <button
                  key={`${v.type}-${v.id}`}
                  onClick={() => { setSelectedVehicle(v); setNotes(""); setImages([]); setError(""); }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedVehicle?.id === v.id ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
                >
                  <div className="font-black text-lg text-slate-800">{v.plate}</div>
                  <div className="text-xs font-bold text-slate-500">{v.label}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Desktop Instructions (Hidden on Mobile) */}
        <div className="hidden md:flex w-full md:w-2/3 h-full flex-col items-center justify-center text-slate-400 min-h-[300px]">
          <Camera size={48} className="mb-4 opacity-20" />
          <p className="font-bold">Selecciona un vehículo de la lista para iniciar la revista</p>
        </div>
      </div>

      {/* Floating Modal for Inspection Form */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 shrink-0">
              <div>
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Inspeccionando</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-black text-slate-900">{selectedVehicle.plate}</span>
                  <div className="px-3 py-1 bg-slate-100 rounded-xl text-sm font-bold text-slate-700">
                    {selectedVehicle.label}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
              <form id="inspection-form" onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Observaciones {settings.require_notes && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl p-4 focus:ring-2 focus:ring-slate-500 outline-none min-h-[120px] font-medium resize-none"
                    placeholder="Detalles sobre el estado del vehículo..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Evidencia Fotográfica {settings.require_photos && <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-xs font-bold text-slate-400">{images.length}/6 fotos</span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden group border-2 border-slate-200">
                        <img src={img} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}

                    {images.length < 6 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 transition-colors disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}
                        <span className="text-[10px] font-bold mt-1">Agregar</span>
                      </button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="flex-1 py-4 bg-white border-2 border-slate-200 hover:bg-slate-100 text-slate-700 rounded-3xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="inspection-form"
                disabled={saving || uploading}
                className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-2 shadow-xl border border-slate-100 shadow-slate-200 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Guardar Revista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
