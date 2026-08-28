"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/error";
import {
  Users, Footprints, Clock, Truck, Package,
  MessageCircle, CheckCircle2, Building2, Save
} from "lucide-react";

interface BuildingModules {
  id?: string;
  parking_lot_id: string;
  pedestrian_visitors: boolean;
  extended_tariff_hours: boolean;
  moving_permits: boolean;
  package_registry: boolean;
  whatsapp_packages: boolean;
  residents_directory: boolean;
}

const MODULE_CONFIG = [
  {
    key: "residents_directory" as keyof BuildingModules,
    label: "Directorio de Residentes",
    desc: "Gestiona datos privados de residentes (nombre, apartamento, celular). Solo visible para el administrador.",
    icon: Users,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.3)",
  },
  {
    key: "pedestrian_visitors" as keyof BuildingModules,
    label: "Visitantes Peatonales",
    desc: "Registro de personas que ingresan a pie al conjunto. Control de entrada y salida en tiempo real.",
    icon: Footprints,
    color: "#10b981",
    glow: "rgba(16,185,129,0.3)",
  },
  {
    key: "moving_permits" as keyof BuildingModules,
    label: "Permisos de Trasteo",
    desc: "Autorización de mudanzas. El administrador aprueba, el guardia registra la entrada del camión.",
    icon: Truck,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.3)",
  },
  {
    key: "package_registry" as keyof BuildingModules,
    label: "Registro de Paquetes y Domicilios",
    desc: "Control de paquetes y pedidos que llegan al conjunto. Notificación automática al residente.",
    icon: Package,
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.3)",
  },
  {
    key: "whatsapp_packages" as keyof BuildingModules,
    label: "Notificaciones WhatsApp (Paquetes)",
    desc: "Enviar mensaje de WhatsApp al residente cuando llega un paquete. Requiere directorio de residentes activo.",
    icon: MessageCircle,
    color: "#4ade80",
    glow: "rgba(74,222,128,0.3)",
  },
  {
    key: "extended_tariff_hours" as keyof BuildingModules,
    label: "Franjas Horarias Extendidas",
    desc: "Amplía las tarifas de parqueadero a hasta 4 franjas horarias configurables (madrugada, mañana, tarde, noche).",
    icon: Clock,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.3)",
  },
];

interface Props {
  parkingLotId: string;
  onModulesChange?: (modules: BuildingModules) => void;
}

export default function BuildingModulesConfig({ parkingLotId, onModulesChange }: Props) {
  const [modules, setModules] = useState<BuildingModules>({
    parking_lot_id: parkingLotId,
    residents_directory: false,
    pedestrian_visitors: false,
    moving_permits: false,
    package_registry: false,
    whatsapp_packages: false,
    extended_tariff_hours: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!parkingLotId) return;
    fetchModules();
  }, [parkingLotId]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from("building_modules")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setModules(data);
        onModulesChange?.(data);
      } else {
        // Crear registro si no existe
        const { data: newData, error: insertErr } = await supabase
          .from("building_modules")
          .insert([{ parking_lot_id: parkingLotId }])
          .select()
          .single();
        if (!insertErr && newData) {
          setModules(newData);
          onModulesChange?.(newData);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: keyof BuildingModules) => {
    if (key === "parking_lot_id" || key === "id") return;
    // Si desactivan directorio, también desactivan WA de paquetes
    const newVal = !modules[key];
    const updated = { ...modules, [key]: newVal };
    if (key === "residents_directory" && !newVal) {
      updated.whatsapp_packages = false;
    }
    // Si activan WA paquetes, el directorio debe estar activo
    if (key === "whatsapp_packages" && newVal && !modules.residents_directory) {
      updated.residents_directory = true;
    }
    setModules(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        residents_directory: modules.residents_directory,
        pedestrian_visitors: modules.pedestrian_visitors,
        moving_permits: modules.moving_permits,
        package_registry: modules.package_registry,
        whatsapp_packages: modules.whatsapp_packages,
        extended_tariff_hours: modules.extended_tariff_hours,
        updated_at: new Date().toISOString(),
      };

      if (modules.id) {
        const { error: updErr } = await supabase
          .from("building_modules")
          .update(payload)
          .eq("id", modules.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("building_modules")
          .upsert([{ ...payload, parking_lot_id: parkingLotId }]);
        if (insErr) throw insErr;
      }

      setSuccess("Módulos guardados correctamente");
      onModulesChange?.(modules);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size={32} className="text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <Building2 size={22} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Módulos del Conjunto</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>Activa o desactiva las funcionalidades según las necesidades del conjunto</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}
        >
          {saving ? <Spinner size={16} className="text-white" /> : <Save size={16} />}
          Guardar cambios
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert-error text-sm">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Grid de módulos */}
      <div className="grid sm:grid-cols-2 gap-4">
        {MODULE_CONFIG.map((mod) => {
          const Icon = mod.icon;
          const isActive = modules[mod.key] as boolean;

          return (
            <button
              key={mod.key}
              onClick={() => toggle(mod.key)}
              className="text-left w-full rounded-2xl p-5 transition-all duration-200 relative overflow-hidden"
              style={{
                background: isActive
                  ? `rgba(${hexToRgb(mod.color)}, 0.08)`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? `rgba(${hexToRgb(mod.color)}, 0.35)` : "rgba(255,255,255,0.07)"}`,
                boxShadow: isActive ? `0 0 20px rgba(${hexToRgb(mod.color)}, 0.1)` : "none",
              }}
            >
              {/* Línea superior cuando activo */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${mod.color}, transparent)` }}
                />
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl shrink-0 mt-0.5"
                    style={{
                      background: isActive ? `rgba(${hexToRgb(mod.color)}, 0.15)` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isActive ? `rgba(${hexToRgb(mod.color)}, 0.3)` : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <Icon size={18} style={{ color: isActive ? mod.color : "#475569" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm leading-tight" style={{ color: isActive ? "#f1f5f9" : "#94a3b8" }}>
                      {mod.label}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "#475569" }}>
                      {mod.desc}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <div
                  className="shrink-0 w-11 h-6 rounded-full relative transition-all duration-300 mt-0.5"
                  style={{
                    background: isActive ? mod.color : "rgba(255,255,255,0.1)",
                    boxShadow: isActive ? `0 0 10px ${mod.glow}` : "none",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
                    style={{
                      left: isActive ? "calc(100% - 22px)" : "2px",
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Nota informativa */}
      <div className="p-4 rounded-xl text-xs" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#64748b" }}>
        💡 Los módulos desactivados no aparecerán en el panel del administrador ni de los empleados. Puedes cambiarlos en cualquier momento.
      </div>
    </div>
  );
}

// Función auxiliar: convierte hex a rgb para usar en rgba()
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : "99,102,241";
}
