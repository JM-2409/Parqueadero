"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Car, Clock, Calendar, CheckCircle2, X } from "lucide-react";
import { sanitizeInput } from "@/lib/sanitize";
import { calculateFee } from "@/lib/pricing";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { getErrorMessage } from "@/lib/error";

export default function ManualEntry({
  parkingLot,
  allowedVehicles,
  customFields,
}: {
  parkingLot: any;
  allowedVehicles: string[];
  customFields: any[];
}) {
  const parkingLotId = parkingLot.id;
  const [plate, setPlate] = useState("");
  const [debouncedPlate, setDebouncedPlate] = useState("");
  const [type, setType] = useState(allowedVehicles[0] || "carros");
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpecialFee, setIsSpecialFee] = useState(false);
  const [totalFee, setTotalFee] = useState("");
  const [manualReceiptNumber, setManualReceiptNumber] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [tariffs, setTariffs] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatTimeInput = (value: string) => {
    let val = value.replace(/\D/g, ""); // Solo números
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, 2) + ":" + val.slice(2);
    }
    return val;
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlate(plate), 300);
    return () => clearTimeout(timer);
  }, [plate]);

  useEffect(() => {
    const searchVehicle = async () => {
      if (debouncedPlate.length >= 5) {
        const { data } = await supabase
          .from("vehicles")
          .select("*")
          .eq("plate", debouncedPlate.toUpperCase())
          .maybeSingle();

        if (data) {
          if (allowedVehicles.includes(data.type)) {
            setType(data.type);
          }

          const newExtraData = { ...(data.custom_fields_data || {}) };
          if (data.brand && !newExtraData["Marca"] && !newExtraData["brand"])
            newExtraData["Marca"] = data.brand;
          if (data.color && !newExtraData["Color"] && !newExtraData["color"])
            newExtraData["Color"] = data.color;
          if (
            data.owner_name &&
            !newExtraData["Propietario"] &&
            !newExtraData["owner_name"]
          )
            newExtraData["Propietario"] = data.owner_name;

          setExtraData(newExtraData);
        } else {
          setExtraData({});
        }
      } else {
        setExtraData({});
      }
    };
    searchVehicle();
  }, [debouncedPlate, allowedVehicles]);

  useEffect(() => {
    const fetchTariffs = async () => {
      const { data } = await supabase
        .from("tariffs_v3")
        .select("*")
        .eq("parking_lot_id", parkingLotId);
      if (data) setTariffs(data);
    };
    fetchTariffs();
  }, [parkingLotId]);

  useEffect(() => {
    if (
      isSpecialFee ||
      !isCompleted ||
      !entryDate ||
      !entryTime ||
      !exitDate ||
      !exitTime
    )
      return;

    const entry = new Date(`${entryDate}T${entryTime}`);
    const exit = new Date(`${exitDate}T${exitTime}`);

    if (isNaN(entry.getTime()) || isNaN(exit.getTime()) || exit <= entry) {
      setTotalFee("");
      return;
    }

    const durationMs = exit.getTime() - entry.getTime();

    const vehicleTariffs = tariffs.filter((t) => t.vehicle_type === type);
    if (vehicleTariffs.length === 0) return;

    const calculatedFee = calculateFee(entry, exit, vehicleTariffs, {
      entry_grace_period_mins: parkingLot.entry_grace_period_mins,
      shift_grace_period_mins: parkingLot.shift_grace_period_mins,
    });

    setTotalFee(calculatedFee.toString());
  }, [
    entryDate,
    entryTime,
    exitDate,
    exitTime,
    type,
    tariffs,
    isSpecialFee,
    isCompleted,
    parkingLot.entry_grace_period_mins,
    parkingLot.shift_grace_period_mins,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!plate || !entryDate || !entryTime) {
      setError("Placa, fecha y hora de entrada son obligatorios");
      setLoading(false);
      return;
    }

    if (isCompleted && (!exitDate || !exitTime || !totalFee)) {
      setError(
        "Fecha, hora de salida y tarifa son obligatorios para registros completados",
      );
      setLoading(false);
      return;
    }

    // Validar campos personalizados obligatorios
    if (customFields && customFields.length > 0) {
      for (const field of customFields) {
        if (field.required && !extraData[field.name]?.trim()) {
          setError(`El campo ${field.name} es obligatorio`);
          setLoading(false);
          return;
        }
      }
    }

    if (isCompleted) {
      const entry = new Date(`${entryDate}T${entryTime}`);
      const exit = new Date(`${exitDate}T${exitTime}`);
      if (exit <= entry) {
        setError(
          "La fecha y hora de salida deben ser posteriores a la de entrada",
        );
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Check if vehicle exists or create it
      let vehicleId = null;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id, brand, color, owner_name, custom_fields_data")
        .eq("plate", sanitizeInput(plate.toUpperCase()))
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;

        // Merge existing custom fields with new data
        const mergedCustomFields = {
          ...(existingVehicle.custom_fields_data || {}),
          ...extraData,
        };

        // Update existing vehicle with new latest data
        await supabase
          .from("vehicles")
          .update({
            type,
            brand: sanitizeInput(
              extraData["Marca"] ||
                extraData["brand"] ||
                existingVehicle.brand ||
                "",
            ),
            color: sanitizeInput(
              extraData["Color"] ||
                extraData["color"] ||
                existingVehicle.color ||
                "",
            ),
            owner_name: sanitizeInput(
              extraData["Propietario"] ||
                extraData["owner_name"] ||
                existingVehicle.owner_name ||
                "",
            ),
            custom_fields_data: mergedCustomFields,
          })
          .eq("id", vehicleId);
      } else {
        const { data: newVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert([
            {
              plate: sanitizeInput(plate.toUpperCase()),
              type,
              brand: sanitizeInput(
                extraData["Marca"] || extraData["brand"] || "",
              ),
              color: sanitizeInput(
                extraData["Color"] || extraData["color"] || "",
              ),
              owner_name: sanitizeInput(
                extraData["Propietario"] || extraData["owner_name"] || "",
              ),
              custom_fields_data: extraData,
            },
          ])
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = newVehicle.id;
      }

      // Sanitize extraData
      const sanitizedExtraData: Record<string, any> = {};
      Object.keys(extraData).forEach((key) => {
        if (typeof extraData[key] === "string") {
          sanitizedExtraData[key] = sanitizeInput(extraData[key]);
        } else {
          sanitizedExtraData[key] = extraData[key];
        }
      });

      // 2. Create session
      const entryTimestamp = new Date(
        `${entryDate}T${entryTime}`,
      ).toISOString();
      const exitTimestamp = isCompleted
        ? new Date(`${exitDate}T${exitTime}`).toISOString()
        : null;

      // Determinar número de recibo para todas las sesiones (activas o completadas)
      let receiptNumber = manualReceiptNumber.trim();

      if (receiptNumber) {
        // El usuario ingresó un recibo manualmente.
        // Intentamos extraer la parte numérica para actualizar la secuencia de la base de datos
        // y asegurar que el SIGUIENTE auto-generado sea el que sigue después de este.
        const numericPart = receiptNumber.replace(/\D/g, "");
        if (numericPart) {
          const parsedNumber = parseInt(numericPart, 10);
          if (!isNaN(parsedNumber)) {
            // Obtenemos la secuencia actual primero
            const { data: lotData } = await supabase
              .from("parking_lots")
              .select("receipt_sequence")
              .eq("id", parkingLotId)
              .single();

            const currentSeq = lotData?.receipt_sequence || 0;

            // Forzamos la actualización de la secuencia al número ingresado
            // para asegurar que el sistema continúe a partir de aquí.
            const { error: updateError } = await supabase
              .from("parking_lots")
              .update({ receipt_sequence: parsedNumber })
              .eq("id", parkingLotId);

            if (updateError) {
              console.error("Error updating receipt sequence:", updateError);
            }
          }
        }
      } else {
        // No hay recibo manual, autogeneramos el consecutivo.
        const { data: lotData } = await supabase
          .from("parking_lots")
          .select("receipt_sequence")
          .eq("id", parkingLotId)
          .single();
        const nextSeq = (lotData?.receipt_sequence || 0) + 1;
        await supabase
          .from("parking_lots")
          .update({ receipt_sequence: nextSeq })
          .eq("id", parkingLotId);

        receiptNumber = nextSeq;
      }

      const sessionData: any = {
        parking_lot_id: parkingLotId,
        vehicle_id: vehicleId,
        status: isCompleted ? "completed" : "active",
        entry_time: entryTimestamp,
        entry_employee_name: "Admin (Manual)",
        extra_data: sanitizedExtraData,
        receipt_number: Number(receiptNumber),
      };

      if (isCompleted) {
        const durationMinutes = Math.round(
          (new Date(exitTimestamp!).getTime() -
            new Date(entryTimestamp).getTime()) /
            60000,
        );

        sessionData.exit_time = exitTimestamp;
        sessionData.exit_employee_name = "Admin (Manual)";
        sessionData.fee = parseFloat(totalFee);
        sessionData.total_charged = parseFloat(totalFee);
        sessionData.duration_minutes = durationMinutes;
      }

      const { error: sessionError } = await supabase
        .from("parking_sessions")
        .insert([sessionData]);

      if (sessionError) throw sessionError;

      setSuccess("Registro histórico añadido exitosamente");
      setPlate("");
      setTotalFee("");
      setManualReceiptNumber("");
      setExtraData({});

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Error al guardar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-indigo-50 text-slate-900 rounded-3xl flex items-center justify-center">
          <Clock size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ingreso de Emergencia (Forzado)
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Ingresa vehículos evadiendo el bloqueo por ocupación máxima, o añade registros al historial.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3 font-bold text-sm">
          <X size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && <SuccessMessage message={success} />}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vehicle Info */}
          <div className="space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 text-lg tracking-tight">
              Datos del Vehículo
            </h3>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Placa *
              </label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold uppercase transition-all"
                placeholder="ABC-123"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Tipo de Vehículo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold capitalize transition-all"
              >
                {allowedVehicles.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {customFields?.map((field, idx) => (
              <div key={idx}>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  {field.name} {field.required && "*"}
                </label>
                <input
                  type="text"
                  value={extraData[field.name] || ""}
                  onChange={(e) => {
                    const val = field.name.toLowerCase().includes("placa")
                      ? e.target.value.toUpperCase()
                      : e.target.value;
                    setExtraData({ ...extraData, [field.name]: val })
                  }}
                  required={field.required}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                />
              </div>
            ))}
          </div>

          {/* Time Info */}
          <div className="space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 text-lg tracking-tight">
              Datos de Tiempo
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Fecha Entrada *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Hora Entrada *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM (24h)"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="Formato 24 horas, ej. 14:30"
                  value={entryTime}
                  onChange={(e) =>
                    setEntryTime(formatTimeInput(e.target.value))
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                  required
                />
              </div>
            </div>

            <div className="mt-6 mb-4">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Número de Recibo Físico (Opcional)
              </label>
              <input
                type="number"
                value={manualReceiptNumber}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-", "."].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setManualReceiptNumber(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold uppercase transition-all placeholder-slate-300"
                placeholder="Ej. 12345"
              />
              <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">
                Aplica tanto para vehículos activos como completados. Si se deja en blanco, se genera el consecutivo automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6 mb-2 p-4 bg-slate-50 rounded-3xl border border-slate-100">
              <input
                type="checkbox"
                id="isCompleted"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-500 transition-colors"
              />
              <label
                htmlFor="isCompleted"
                className="text-sm font-bold text-slate-700 cursor-pointer select-none"
              >
                El vehículo ya salió (Completado)
              </label>
            </div>

            {isCompleted && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                      Fecha Salida *
                    </label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={(e) => setExitDate(e.target.value)}
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                      required={isCompleted}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                      Hora Salida *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:MM (24h)"
                      pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                      title="Formato 24 horas, ej. 14:30"
                      value={exitTime}
                      onChange={(e) =>
                        setExitTime(formatTimeInput(e.target.value))
                      }
                      className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-slate-500 outline-none font-bold transition-all"
                      required={isCompleted}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="isSpecialFee"
                      checked={isSpecialFee}
                      onChange={(e) => setIsSpecialFee(e.target.checked)}
                      className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-500 transition-colors"
                    />
                    <label
                      htmlFor="isSpecialFee"
                      className="text-sm font-bold text-slate-700 cursor-pointer select-none"
                    >
                      Tarifa especial (Ingresar valor manualmente)
                    </label>
                  </div>

                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 mt-4 ml-1">
                    Tarifa Cobrada ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      disabled={!isSpecialFee}
                      className={`w-full text-base rounded-3xl px-5 py-3 pl-8 outline-none font-black transition-all ${!isSpecialFee ? "bg-slate-100/50 text-slate-500 border border-slate-100" : "bg-slate-50 border-0 text-slate-900 focus:ring-2 focus:ring-slate-500 shadow-xl border border-slate-100 shadow-indigo-100/50"}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required={isCompleted}
                    />
                  </div>
                  {!isSpecialFee && (
                    <p className="text-xs font-bold text-slate-400 mt-2 ml-1">
                      El valor se calcula automáticamente según las tarifas.
                      Marca{" "}
                      <span className="font-bold text-slate-500">
                        &quot;Tarifa especial&quot;
                      </span>{" "}
                      para modificarlo.
                    </p>
                  )}

                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-indigo-400 text-white rounded-3xl font-bold transition-all shadow-xl border border-slate-100 shadow-slate-200 flex items-center justify-center gap-3 text-lg mx-auto"
          >
            {loading ? (
              <Spinner size={24} className="text-white" />
            ) : (
              <>
                <Car size={24} />
                Guardar Registro Histórico
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
