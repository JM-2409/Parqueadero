"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Camera, Save, X, ImageIcon, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function VehicleInspections({
  parkingLot,
  profile,
}: {
  parkingLot: any;
  profile: any;
}) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Form states
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = parkingLot?.inspection_settings || { require_photos: false, require_notes: false, enabled: true };

  useEffect(() => {
    fetchVehicles();
  }, []);

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
            });
          }
        });
      }

      setVehicles(combined);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 4) {
      setError("Máximo 4 imágenes por revista.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;

        const res = await fetch("/api/upload-cloudinary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64data }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");

        setImages((prev) => [...prev, data.secure_url]);
      };
    } catch (err: any) {
      setError(err.message);
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
        });

      if (insertError) throw insertError;

      setSuccess(`Revista guardada para el vehículo ${selectedVehicle.plate}`);
      setTimeout(() => setSuccess(""), 3000);

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

  const filteredVehicles = vehicles.filter(v =>
    v.plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!settings.enabled) {
    return (
       <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl">
         <p className="text-slate-500 font-bold">Las revistas están deshabilitadas en la configuración del parqueadero.</p>
       </div>
    );
  }

  if (loading) return <div className="text-center py-8"><Spinner size={24} className="mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {success && <SuccessMessage message={success} />}

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row gap-6">
        {/* Left Col: Vehicle Selection */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-slate-100 pr-0 md:pr-6">
          <h3 className="text-lg font-bold text-slate-900">Vehículos Activos</h3>

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

        {/* Right Col: Inspection Form */}
        <div className="w-full md:w-2/3">
          {!selectedVehicle ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
              <Camera size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Selecciona un vehículo para iniciar la revista</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase">Inspeccionando</span>
                  <span className="text-2xl font-black text-slate-900">{selectedVehicle.plate}</span>
                </div>
                <div className="px-3 py-1 bg-white rounded-xl text-sm font-bold text-slate-700 shadow-sm">
                  {selectedVehicle.label}
                </div>
              </div>

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
                  <span className="text-xs font-bold text-slate-400">{images.length}/4 fotos</span>
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

                  {images.length < 4 && (
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

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 py-4 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-700 rounded-3xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold transition-colors flex items-center justify-center gap-2 shadow-xl border border-slate-100 shadow-slate-200 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Guardar Revista
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
