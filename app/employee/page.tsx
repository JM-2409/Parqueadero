"use client";

import styles from "./employee.module.css";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Car,
  LogOut,
  LogIn,
  Search,
  CheckCircle2,
  DollarSign,
  Clock,
  User,
  History,
  Menu,
  X,
  Home,
  Camera,
  Bike,
  Truck,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import EmployeeHistory from "./EmployeeHistory";
import PrivateSpaces from "./PrivateSpaces";
import ReceiptModal from "./ReceiptModal";
import Image from "next/image";
import InspectionsTab from "./InspectionsTab";
import { calculateFee } from "@/lib/pricing";

import { sanitizeInput } from "@/lib/sanitize";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { getErrorMessage } from "@/lib/error";
import { downloadClosureReport } from "@/lib/reports";

// Validación segura de preferencias en localStorage
const ALLOWED_PREF_KEYS = [
  "pref_autoPrint",
  "pref_sound",
  "pref_confirmEntry",
  "pref_showNotes",
];

const getSecurePref = (key: string, defaultValue: boolean): boolean => {
  if (typeof window === "undefined" || !ALLOWED_PREF_KEYS.includes(key)) return defaultValue;
  try {
    const value = localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setSecurePref = (key: string, value: boolean): void => {
  if (typeof window === "undefined" || !ALLOWED_PREF_KEYS.includes(key)) return;
  try {
    // Garantizamos que solo se guarden "true" o "false"
    localStorage.setItem(key, value ? "true" : "false");
  } catch (e) {
    console.error("Error setting preference", e);
  }
};

export default function EmployeePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("operation"); // operation, history, private, inspections
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Shift state
  const [shiftName, setShiftName] = useState("");
  const [isShiftSet, setIsShiftSet] = useState(false);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [blacklistedCount, setBlacklistedCount] = useState<number>(0);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmEntry, setShowConfirmEntry] = useState(false);

  // Search in Active Sessions
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  // Preferencias Opcionales
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefAutoPrint, setPrefAutoPrint] = useState(false);
  const [prefSound, setPrefSound] = useState(true);
  const [prefConfirmEntry, setPrefConfirmEntry] = useState(true);
  const [prefShowNotes, setPrefShowNotes] = useState(false);
  const [prefRequirePhoto, setPrefRequirePhoto] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Receipt Modal
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [viewingSession, setViewingSession] = useState<any>(null);

  // Form states
  const [plate, setPlate] = useState("");
  const [debouncedPlate, setDebouncedPlate] = useState("");
  const [type, setType] = useState("carros");
  const [isNewVehicle, setIsNewVehicle] = useState(true);
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [previousObservation, setPreviousObservation] = useState<{ text?: string, photoUrl?: string } | null>(null);
  const [usePreviousObservation, setUsePreviousObservation] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<{
    plate: string;
    reason: string;
  } | null>(null);

  // Exit form states
  const [exitPlate, setExitPlate] = useState("");
  const [fee, setFee] = useState("");

  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState<string | null>(null);
  const [accumulatedRevenue, setAccumulatedRevenue] = useState(0);
  const [isClosingRegister, setIsClosingRegister] = useState(false);

  const fetchRevenue = useCallback(async (id: string) => {
    const { data: lastClosure } = await supabase
      .from("cash_closures")
      .select("closed_at")
      .eq("parking_lot_id", id)
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastClosureTime = lastClosure ? lastClosure.closed_at : null;

    let query = supabase
      .from("parking_sessions")
      .select("total_charged")
      .eq("parking_lot_id", id)
      .not("exit_time", "is", null);

    if (lastClosureTime) {
      query = query.gt("exit_time", lastClosureTime);
    }

    const { data: shiftData } = await query;
    if (shiftData) {
      const revenue = shiftData.reduce(
        (sum, s) => sum + (Number(s.total_charged) || 0),
        0,
      );
      setAccumulatedRevenue(revenue);
    }
  }, []);


  const handleCloseRegister = async () => {
    if (
      !window.confirm(
        "¿Está seguro que desea cerrar la caja? El recaudo volverá a $0 para su turno.",
      )
    )
      return;
    setIsClosingRegister(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data: lastClosure } = await supabase
        .from("cash_closures")
        .select("closed_at")
        .eq("parking_lot_id", parkingLot.id)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const opened_at = lastClosure
        ? lastClosure.closed_at
        : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const { data: newClosure, error } = await supabase.from("cash_closures").insert([
        {
          parking_lot_id: parkingLot.id,
          total_revenue: accumulatedRevenue,
          closed_by: session?.user?.id,
          opened_at: opened_at,
          notes: `Cierre de caja - ${shiftName || "Operario"}`,
        },
      ]).select().single();

      if (error) throw error;

      playBeep("success");
      setSuccess("Caja cerrada exitosamente.");

      // Auto-download report
      if (newClosure) {
        downloadClosureReport(newClosure, parkingLot?.name);
      }

      setTimeout(() => setSuccess(""), 3000);

      // re-fetch revenue to reset to $0
      await fetchRevenue(parkingLot.id);
    } catch (err: unknown) {
      console.error("Error cerrado caja", err);
      playBeep("error");
      setError("No se pudo cerrar la caja: " + getErrorMessage(err));
    } finally {
      setIsClosingRegister(false);
    }
  };

  const fetchParkingLot = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setParkingLot(data);
        if (data.allowed_vehicles && data.allowed_vehicles.length > 0) {
          setType(data.allowed_vehicles[0]);
        }

        // Override local preferences with Admin global settings
        if (data.settings) {
          if (typeof data.settings.autoPrint === "boolean")
            setPrefAutoPrint(data.settings.autoPrint);
          if (typeof data.settings.confirmEntry === "boolean")
            setPrefConfirmEntry(data.settings.confirmEntry);
          if (typeof data.settings.showNotes === "boolean")
            setPrefShowNotes(data.settings.showNotes);
          if (typeof data.settings.requirePhoto === "boolean")
            setPrefRequirePhoto(data.settings.requirePhoto);
        }
      }

      await fetchRevenue(id);

      const { data: appData } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (appData) setAppSettings(appData);

      const { data: tariffData } = await supabase
        .from("tariffs_v3")
        .select("*")
        .eq("parking_lot_id", id);
      if (tariffData) setTariffs(tariffData);

      setLoading(false);
    },
    [fetchRevenue],
  );

  const fetchActiveSessions = useCallback(async (parkingLotId: string) => {
    const { data } = await supabase
      .from("parking_sessions")
      .select("*, vehicles(*)")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "active")
      .order("receipt_number", { ascending: false })
      .order("entry_time", { ascending: false });
    setActiveSessions(data || []);
  }, []);

  const fetchSubscribers = useCallback(async (parkingLotId: string) => {
    const { data } = await supabase
      .from("monthly_subscribers")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString().split("T")[0])
      .lte("start_date", new Date().toISOString().split("T")[0]);

    if (data) setSubscribers(data);
  }, []);

  const fetchBlacklistedCount = useCallback(async (parkingLotId: string) => {
    const { count } = await supabase
      .from("blacklisted_vehicles")
      .select("*", { count: "exact", head: true })
      .eq("parking_lot_id", parkingLotId);
    if (count !== null) setBlacklistedCount(count);
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      let profileData = null;
      let profileError = null;

      const { data: profileWithLots, error: errWithLots } = await supabase
        .from("profiles")
        .select("*, parking_lots(*)")
        .eq("id", session.user.id)
        .single();

      if (
        errWithLots &&
        (errWithLots.message.includes("is_suspended") ||
          errWithLots.message.includes("subscription_end_date"))
      ) {
        const { data: fallbackProfile, error: errFallback } = await supabase
          .from("profiles")
          .select(
            "*, parking_lots(id, name, nit, address, capacity, allowed_vehicles, show_revenue, created_at)",
          )
          .eq("id", session.user.id)
          .single();

        profileData = fallbackProfile;
        profileError = errFallback;
      } else {
        profileData = profileWithLots;
        profileError = errWithLots;
      }

      if (profileError || profileData?.role !== "employee") {
        router.push("/");
        return;
      }

      if (profileData.parking_lots && profileData.parking_lots.is_suspended) {
        await supabase.auth.signOut();
        router.push("/login?error=suspended");
        return;
      }

      const subEnd = profileData.parking_lots?.subscription_end_date;
      if (subEnd && new Date(subEnd) < new Date()) {
        await supabase.auth.signOut();
        router.push("/login?error=expired");
        return;
      }

      setProfile(profileData);
      fetchParkingLot(profileData.parking_lot_id);
      fetchActiveSessions(profileData.parking_lot_id);
      fetchSubscribers(profileData.parking_lot_id);
      fetchBlacklistedCount(profileData.parking_lot_id);
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [
    router,
    fetchParkingLot,
    fetchActiveSessions,
    fetchSubscribers,
    fetchBlacklistedCount,
  ]);

  const playBeep = useCallback((type: "success" | "error") => {
    if (getSecurePref("pref_sound", true)) {
      try {
        const audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        if (type === "success") {
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            1200,
            audioCtx.currentTime + 0.1,
          );
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioCtx.currentTime + 0.1,
          );
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        } else {
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(
            150,
            audioCtx.currentTime + 0.2,
          );
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioCtx.currentTime + 0.2,
          );
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
        }
      } catch (e) {
        console.log("Audio not supported", e);
      }
    }
  }, []);

  useEffect(() => {
    // Check for saved shift
    const savedShift = sessionStorage.getItem("shiftName");
    if (savedShift && !isShiftSet) {
      setShiftName(savedShift);
      setIsShiftSet(true);
    }

    // Load Prefs with safe getters
    setPrefAutoPrint(getSecurePref("pref_autoPrint", false));
    setPrefSound(getSecurePref("pref_sound", true));
    setPrefConfirmEntry(getSecurePref("pref_confirmEntry", true));
    setPrefShowNotes(getSecurePref("pref_showNotes", false));

    checkUser();
  }, [checkUser, isShiftSet]);

  useEffect(() => {
    if (!parkingLot?.id) return;

    const channel = supabase
      .channel("public:parking_sessions:employee_active")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_sessions",
          filter: `parking_lot_id=eq.${parkingLot.id}`,
        },
        () => {
          fetchActiveSessions(parkingLot.id);
          fetchRevenue(parkingLot.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parkingLot?.id, fetchActiveSessions, fetchRevenue]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlate(plate), 300);
    return () => clearTimeout(timer);
  }, [plate]);

  useEffect(() => {
    const searchVehicle = async () => {
      if (debouncedPlate.length >= 5) {
        let foundData = null;
        let newExtraData: Record<string, string> = {};

        // 1. Search in global vehicles
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("plate", debouncedPlate.toUpperCase())
          .maybeSingle();

        if (vehicleData) {
          foundData = vehicleData;
          if (vehicleData.type) setType(vehicleData.type);
          newExtraData = { ...(vehicleData.custom_fields_data || {}) };

          if (vehicleData.brand && !newExtraData["Marca"] && !newExtraData["brand"])
            newExtraData["Marca"] = vehicleData.brand;
          if (vehicleData.color && !newExtraData["Color"] && !newExtraData["color"])
            newExtraData["Color"] = vehicleData.color;
          if (vehicleData.owner_name && !newExtraData["Propietario"] && !newExtraData["owner_name"])
            newExtraData["Propietario"] = vehicleData.owner_name;
        }

        // 2. Search in active private parking spaces
        if (parkingLot?.id) {
          // Determinamos el campo principal
          const mainField = parkingLot.private_custom_fields?.find((f: any) => f.is_main)?.name;

          const { data: privateSpaces } = await supabase
            .from("private_parking_spaces")
            .select("custom_fields_data")
            .eq("parking_lot_id", parkingLot.id);

          if (privateSpaces) {
            const matchedSpace = privateSpaces.find((space) => {
              const cf = space.custom_fields_data || {};
              if (mainField && cf[mainField] && cf[mainField].toUpperCase() === debouncedPlate.toUpperCase()) {
                  return true;
              }
              // Fallback
              const plateKey = Object.keys(cf).find(k => k.toLowerCase() === 'placa');
              if (plateKey && cf[plateKey]?.toUpperCase() === debouncedPlate.toUpperCase()) {
                return true;
              }
              return false;
            });

            if (matchedSpace) {
              foundData = matchedSpace;
              const cf = matchedSpace.custom_fields_data || {};

              // Merge matching keys (like Celular -> Celular, etc)
              // We just merge everything into extraData. The input form will map by exact name.
              Object.keys(cf).forEach(key => {
                 // Ignore Placa or Main field as it's already in the main input
                 if (key.toLowerCase() !== 'placa' && key !== mainField && !newExtraData[key]) {
                     newExtraData[key] = cf[key];
                 }
              });
            }
          }

          // 3. Search in private parking history
          let historyQuery = supabase
            .from("private_parking_history")
            .select("custom_fields_data, plate")
            .eq("parking_lot_id", parkingLot.id);

          if (mainField) {
             historyQuery = historyQuery.or(`plate.eq.${debouncedPlate.toUpperCase()},custom_fields_data->>${mainField}.ilike.${debouncedPlate}`);
          } else {
             historyQuery = historyQuery.eq("plate", debouncedPlate.toUpperCase());
          }

          const { data: historySpaces } = await historyQuery
            .order("released_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (historySpaces) {
             foundData = historySpaces;
             const cf = historySpaces.custom_fields_data || {};
             Object.keys(cf).forEach(key => {
                 if (key.toLowerCase() !== 'placa' && key !== mainField && !newExtraData[key]) {
                     newExtraData[key] = cf[key];
                 }
              });
          }
        }

          // 4. Search in regular parking history for previous observations
          const { data: previousSession } = await supabase
            .from("parking_sessions")
            .select("extra_data, vehicles!inner(plate)")
            .eq("parking_lot_id", parkingLot.id)
            .eq("vehicles.plate", debouncedPlate.toUpperCase())
            .not("exit_time", "is", null)
            .order("entry_time", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (previousSession && previousSession.extra_data) {
            const obs = previousSession.extra_data["Observaciones"];
            const photoUrl = previousSession.extra_data["observation_photo_url"];
            if (obs || photoUrl) {
              setPreviousObservation({ text: obs, photoUrl: photoUrl });
              setUsePreviousObservation(false);
            } else {
              setPreviousObservation(null);
              setUsePreviousObservation(false);
            }
          } else {
            setPreviousObservation(null);
            setUsePreviousObservation(false);
          }

        if (foundData) {
          setExtraData(newExtraData);
          setIsNewVehicle(false);
        } else {
          setIsNewVehicle(true);
          setExtraData({});
        }
      } else {
        setIsNewVehicle(true);
        setExtraData({});
        setPreviousObservation(null);
        setUsePreviousObservation(false);
      }
    };
    searchVehicle();
  }, [debouncedPlate, parkingLot?.id]);

  const logShiftAction = async (action: "login" | "logout", name: string) => {
    if (!parkingLot) return;
    try {
      await supabase.from("employee_logs").insert([
        {
          parking_lot_id: parkingLot.id,
          employee_name: name,
          action: action,
        },
      ]);
    } catch (e) {
      console.log("No se pudo registrar log");
    }
  };

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (shiftName.trim()) {
      sessionStorage.setItem("shiftName", shiftName.trim());
      setIsShiftSet(true);
      logShiftAction("login", shiftName.trim());
    }
  };

  const handleSearchPlate = (searchPlate: string) => {
    setPlate(searchPlate);
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEntry) return;

    setError("");
    setSuccess("");

    if (!plate || !type) {
      playBeep("error");
      setError("Placa y tipo son obligatorios");
      return;
    }

    // Check capacity
    if (activeSessions.length >= parkingLot.capacity) {
      playBeep("error");
      setError("El parqueadero está lleno. Por favor, solicite a la administración realizar un ingreso de emergencia si es necesario.");
      return;
    }

    if (prefShowNotes && prefRequirePhoto && !photoDataUrl) {
      playBeep("error");
      setError("Es obligatorio tomar una foto de observación");
      return;
    }

    if (prefConfirmEntry) {
      setShowConfirmEntry(true);
    } else {
      processEntry();
    }
  };

  const processEntry = async () => {
    if (!navigator.onLine) {
      setError("Sin conexión a internet. Requiere conexión para registrar entrada.");
      return;
    }
    setIsSubmittingEntry(true);
    setShowConfirmEntry(false);
    setError("");
    setSuccess("");

    // Check blacklist
    const { data: blacklistedItem } = await supabase
      .from("blacklisted_vehicles")
      .select("reason")
      .eq("parking_lot_id", parkingLot.id)
      .eq("plate", plate.toUpperCase())
      .maybeSingle();

    if (blacklistedItem) {
      setBlacklistAlert({
        plate: plate.toUpperCase(),
        reason: blacklistedItem.reason,
      });
      setIsSubmittingEntry(false);
      return;
    }

    // Validate custom fields
    if (parkingLot?.custom_fields) {
      for (const field of parkingLot.custom_fields) {
        if (field.required && !extraData[field.name]) {
          setError(`El campo ${field.name} es obligatorio`);
          setIsSubmittingEntry(false);
          return;
        }
      }
    }

    let vehicleId = null;

    if (isNewVehicle) {
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

      if (vehicleError) {
        setError("Error al registrar vehículo: " + vehicleError.message);
        setIsSubmittingEntry(false);
        return;
      }
      vehicleId = newVehicle.id;
    } else {
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id, brand, color, owner_name, custom_fields_data")
        .eq("plate", plate.toUpperCase())
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;

        // Merge existing custom fields with new data
        const mergedCustomFields = {
          ...(existingVehicle.custom_fields_data || {}),
          ...extraData,
        };

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
      }
    }

    if (vehicleId) {
      // Sanitize extraData
      const sanitizedExtraData: Record<string, any> = {};
      Object.keys(extraData).forEach((key) => {
        if (typeof extraData[key] === "string") {
          sanitizedExtraData[key] = sanitizeInput(extraData[key]);
        } else {
          sanitizedExtraData[key] = extraData[key];
        }
      });

      // Handle photo upload or reused photo
      if (prefShowNotes) {
        if (photoFile) {
          const mimeType = (photoFile.type || "image/jpeg").toLowerCase();
          const EXTENSION_MAP: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
          };

          if (!EXTENSION_MAP[mimeType] || mimeType === "image/svg+xml" || mimeType === "text/html") {
            playBeep("error");
            setError("Formato de imagen no seguro o inválido. Use JPG, PNG, WEBP o GIF.");
            setIsSubmittingEntry(false);
            return;
          }

          const fileExt = EXTENSION_MAP[mimeType];
          const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${parkingLot.id}/${fileName}`;

          try {
            const arrayBuffer = await photoFile.arrayBuffer();
            const { data: uploadData, error: uploadError } =
              await supabase.storage
                .from("observations")
                .upload(filePath, arrayBuffer, {
                  contentType: photoFile.type || "image/jpeg",
                });

            if (!uploadError && uploadData) {
              const { data: publicUrlData } = supabase.storage
                .from("observations")
                .getPublicUrl(filePath);
              sanitizedExtraData["observation_photo_url"] =
                publicUrlData.publicUrl;
            } else {
              console.error("Error uploading photo", uploadError);
            }
          } catch (err) {
            console.error("Failed to process photo buffer", err);
          }
        } else if (usePreviousObservation && previousObservation?.photoUrl) {
          // Reusing the photo url
          sanitizedExtraData["observation_photo_url"] = previousObservation.photoUrl;
        }
      }

      // Generate receipt number on entry
      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("receipt_sequence")
        .eq("id", parkingLot.id)
        .single();

      const nextSeq = (lotData?.receipt_sequence || 0) + 1;
      const receiptNumber = nextSeq;

      // Check if receipt number already exists
      const { data: existingSession } = await supabase
        .from("parking_sessions")
        .select("id")
        .eq("parking_lot_id", parkingLot.id)
        .eq("receipt_number", receiptNumber)
        .maybeSingle();

      if (existingSession) {
        playBeep("error");
        setError("El número de ticket ya está registrado");
        setIsSubmittingEntry(false);
        return;
      }

      await supabase
        .from("parking_lots")
        .update({ receipt_sequence: nextSeq })
        .eq("id", parkingLot.id);

      const { error: sessionError } = await supabase
        .from("parking_sessions")
        .insert([
          {
            parking_lot_id: parkingLot.id,
            vehicle_id: vehicleId,
            status: "active",
            entry_employee_name: shiftName,
            extra_data: sanitizedExtraData,
            receipt_number: receiptNumber,
          },
        ]);

      if (sessionError) {
        playBeep("error");
        setError("Error al registrar ingreso: " + sessionError.message);
      } else {
        playBeep("success");
        setSuccess("Ingreso registrado exitosamente");

        // Handle AutoPrint
        if (prefAutoPrint) {
          // Open receipt automatically pointing to the created session
          setViewingSession({
            id: "mocked-id", // Ideally get the inserted ID, but we just re-fetch
            entry_employee_name: shiftName,
            status: "active",
            entry_time: new Date().toISOString(),
            vehicles: { plate: plate.toUpperCase(), type },
            receipt_number: receiptNumber,
          });
          setShowReceipt(true);
        }

        setPlate("");
        setDebouncedPlate("");
        setExtraData({});
        setPhotoDataUrl(null);
        setPhotoFile(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
        setIsNewVehicle(true);
        await fetchActiveSessions(parkingLot.id);
        setTimeout(() => setSuccess(""), 3000);
      }
    }
    setIsSubmittingEntry(false);
  };

  const handleExit = async (sessionId: string) => {
    if (!navigator.onLine) {
      setError("Sin conexión a internet. Requiere conexión para registrar salida.");
      return;
    }
    if (
      !window.confirm(
        "¿Estás seguro de que deseas registrar la salida de este vehículo?",
      )
    ) {
      return;
    }

    if (isSubmittingExit === sessionId) return;
    setIsSubmittingExit(sessionId);
    setError("");
    setSuccess("");

    let sessionToExit = activeSessions.find((s) => s.id === sessionId);
    if (!sessionToExit) {
      const { data: dbSession } = await supabase
        .from("parking_sessions")
        .select("*, vehicles(*)")
        .eq("id", sessionId)
        .single();
      if (dbSession) {
        sessionToExit = dbSession;
      }
    }

    if (!sessionToExit) {
      setIsSubmittingExit(null);
      setError("No se pudo encontrar la sesión");
      return;
    }

    const entryTime = new Date(sessionToExit.entry_time);
    const exitTime = new Date();
    const rules = tariffs.filter(
      (t) => t.vehicle_type === sessionToExit.vehicles.type,
    );

    // Check if the user is an active monthly subscriber
    const { data: subscriber } = await supabase
      .from("monthly_subscribers")
      .select("id")
      .eq("parking_lot_id", parkingLot.id)
      .eq("plate", sessionToExit.vehicles.plate)
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString().split("T")[0])
      .lte("start_date", new Date().toISOString().split("T")[0])
      .maybeSingle();

    // Fee is strictly calculated
    let finalFee = 0;
    if (!subscriber) {
      finalFee = calculateFee(entryTime, exitTime, rules, {
        entry_grace_period_mins: parkingLot.entry_grace_period_mins,
        shift_grace_period_mins: parkingLot.shift_grace_period_mins,
      });
    }

    // Preserve existing receipt number, or generate if missing (for backwards compatibility)
    let receiptNumber = sessionToExit.receipt_number;

    if (!receiptNumber) {
      const { data: lotData } = await supabase
        .from("parking_lots")
        .select("receipt_sequence")
        .eq("id", parkingLot.id)
        .single();
      const nextSeq = (lotData?.receipt_sequence || 0) + 1;
      await supabase
        .from("parking_lots")
        .update({ receipt_sequence: nextSeq })
        .eq("id", parkingLot.id);
      receiptNumber = nextSeq;
    }

    const durationMinutes = Math.round(
      (exitTime.getTime() - entryTime.getTime()) / 60000,
    );

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({
        status: "completed",
        exit_time: exitTime.toISOString(),
        fee: finalFee,
        total_charged: finalFee,
        receipt_number: receiptNumber,
        duration_minutes: durationMinutes,
        exit_employee_name: shiftName,
      })
      .eq("id", sessionId)
      .select("*, vehicles(*)")
      .single();

    if (updateError) {
      setError("Error al registrar salida: " + updateError.message);
    } else {
      setSuccess("Salida registrada exitosamente");
      setExitPlate("");
      setFee("");
      await fetchActiveSessions(parkingLot.id);
      setSelectedSession(updatedSession);

      // Auto-send whatsapp if configured
      if (
        parkingLot?.features?.whatsapp_receipts &&
        parkingLot?.settings?.auto_send_whatsapp &&
        sessionToExit.extra_data &&
        (sessionToExit.extra_data.whatsapp || sessionToExit.extra_data.telefono || sessionToExit.extra_data.celular)
      ) {
        // Extract phone number from extra_data
        const phoneNumber = sessionToExit.extra_data.whatsapp || sessionToExit.extra_data.telefono || sessionToExit.extra_data.celular;

        try {
          const baseUrl = window.location.origin;
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;

          const params = new URLSearchParams({
            receiptNumber: receiptNumber.toString(),
            plate: sessionToExit.vehicles.plate,
            type: sessionToExit.vehicles.type,
            total: finalFee.toString(),
            entry: entryTime.toLocaleString(),
            exit: exitTime.toLocaleString(),
            duration: `${hours}h ${minutes}m`,
            logoUrl: parkingLot?.logo_url || appSettings?.logo_url || "",
            lotName: parkingLot.name,
          });

          const imageUrl = `${baseUrl}/api/receipt-image?${params.toString()}`;

          // Send background request to api/whatsapp
          fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phoneNumber,
              mediaUrl: imageUrl,
              text: `¡Gracias por su visita!`
            })
          }).catch(err => {
            // Log but don't disrupt user flow
            console.error('Failed to auto-send whatsapp receipt', err);
          });
        } catch (err) {
          console.error('Error preparing auto-whatsapp data:', err);
        }
      }
      setShowReceipt(true);
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsSubmittingExit(null);
  };

  const handleLogout = async () => {
    await logShiftAction("logout", shiftName);
    sessionStorage.removeItem("shiftName");
    await supabase.auth.signOut();
    router.push("/");
  };

  const savePref = (key: string, value: boolean) => {
    setSecurePref(key, value);
    if (key === "pref_autoPrint") setPrefAutoPrint(value);
    if (key === "pref_sound") setPrefSound(value);
    if (key === "pref_confirmEntry") setPrefConfirmEntry(value);
    if (key === "pref_showNotes") setPrefShowNotes(value);
  };

  const filteredActiveSessions = activeSessions.filter(s =>
    s.vehicles.plate.toLowerCase().includes(activeSearchQuery.toLowerCase())
  );

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50  flex flex-col md:flex-row">
        <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen animate-pulse"></div>
        <div className="flex-1 p-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white  p-6 rounded-3xl h-96 animate-pulse"></div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white  p-6 rounded-3xl h-32 animate-pulse"></div>
            <div className="bg-white  p-6 rounded-3xl h-32 animate-pulse"></div>
            <div className="bg-white  p-6 rounded-3xl h-32 animate-pulse"></div>
          </div>
        </div>
      </div>
    );

  // SHIFT MODAL
  if (!isShiftSet) {
    return (
      <div className="fixed inset-0 bg-white border-r border-slate-200/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-white  rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-indigo-100 text-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900  mb-2">
            Inicio de Turno
          </h2>
          <p className="text-center text-slate-500 mb-6">
            Por favor, ingresa tu nombre para registrar quién está operando el
            sistema.
          </p>

          <form onSubmit={handleStartShift}>
            <input
              type="text"
              value={shiftName || ""}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full p-4 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg text-center mb-4"
              required
            />
            <button
              type="submit"
              className={`${styles.btnPrimary} py-4 text-lg w-full`}
            >
              Comenzar Turno
            </button>
          </form>
        </div>
      </div>
    );
  }

  // BLACKLIST MODAL
  if (blacklistAlert) {
    return (
      <div className="fixed inset-0 bg-red-900/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white  rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-in zoom-in-95 duration-300 transform transition-all border-4 border-red-500">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <X size={48} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-black text-center text-slate-900  mb-2 uppercase tracking-tight">
            ¡ALERTA ROJA!
          </h2>
          <h3 className="text-xl font-bold text-center text-red-600 mb-6 uppercase">
            Entrada Restringida Módulo De Seguridad
          </h3>

          <div className="bg-slate-50  p-6 rounded-3xl border border-slate-200  mb-8">
            <p className="text-center text-slate-600  mb-2 font-bold">
              El vehículo con placa:
            </p>
            <div className="text-center mb-4">
              <span className="inline-block px-5 py-3 bg-white border-r border-slate-200 text-slate-900 font-mono text-3xl font-bold tracking-widest rounded-3xl">
                {blacklistAlert.plate}
              </span>
            </div>
            <p className="text-center text-slate-600  font-bold">
              Motivo del veto:
            </p>
            <p className="text-center text-red-600 font-bold text-lg mt-1">
              {blacklistAlert.reason}
            </p>
          </div>

          <button
            onClick={() => {
              setBlacklistAlert(null);
              setPlate("");
            }}
            className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-bold text-lg uppercase tracking-wider transition-colors shadow-md border border-slate-100 shadow-red-200 focus:outline-none focus:ring-4 focus:ring-red-500/50"
          >
            Entendido, Rechazar Ingreso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50  flex flex-col md:flex-row w-full overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-800 text-white p-4 flex justify-between items-center shadow-md border-b border-slate-700 z-30 shrink-0">
        <div className="flex items-center gap-3 font-bold text-lg">
          <Car size={24} className="text-white" />
          <span className="truncate max-w-[200px] font-extrabold text-white">
            {parkingLot?.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-3xl transition-colors active:scale-95"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-white border-r border-slate-200/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} md:translate-x-0 fixed md:relative top-0 left-0 z-50 transition-transform duration-300 w-72 bg-white border-r border-slate-200 text-slate-500 flex-shrink-0 flex flex-col h-full`}
      >
        <div className="p-6 flex items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-3 font-bold text-xl text-slate-900">
            <Car size={28} className="text-slate-800" />
            <span>Operación</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-400 hover:text-slate-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-extrabold">
              Turno Actual
            </p>
            <button
              onClick={() => {
                logShiftAction("logout", shiftName);
                sessionStorage.removeItem("shiftName");
                setIsShiftSet(false);
                setShiftName("");
              }}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition-colors"
            >
              Cambiar
            </button>
          </div>
          <div className="flex items-center gap-3 text-slate-900 bg-slate-100 border border-slate-200 p-3 rounded-3xl shadow-sm">
            <User size={16} className="text-slate-600 shrink-0" />
            <span className="font-bold truncate text-slate-800">{shiftName}</span>
          </div>
        </div>

        <nav className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("operation");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-3xl transition-colors ${activeTab === "operation" ? "bg-slate-800 text-white" : "hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <LogIn size={20} />
            <span className="font-bold whitespace-nowrap">
              Ingreso / Salida
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-3xl transition-colors ${activeTab === "history" ? "bg-slate-800 text-white" : "hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <History size={20} />
            <span className="font-bold whitespace-nowrap">Historial</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("private");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-3xl transition-colors ${activeTab === "private" ? "bg-slate-800 text-white" : "hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Home size={20} className="flex-shrink-0" />
            <span className="font-bold whitespace-nowrap">Parq. Privados</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("inspections");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-3xl transition-colors ${activeTab === "inspections" ? "bg-slate-800 text-white" : "hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Camera size={20} className="flex-shrink-0" />
            <span className="font-bold whitespace-nowrap">Revista</span>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-200">
          <div className="mb-4 px-2">
            <p className="text-xs text-slate-500 mb-1">Ocupación</p>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  activeSessions.length >= (parkingLot?.capacity || 1)
                    ? "bg-red-500"
                    : activeSessions.length >= (parkingLot?.capacity || 1) * 0.8
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min((activeSessions.length / (parkingLot?.capacity || 1)) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-right mt-1">
              {activeSessions.length} / {parkingLot?.capacity || 0}
            </p>
          </div>

          {parkingLot?.show_revenue && (
            <div className="mb-6 px-2">
              <p className="text-xs text-slate-500 mb-1">Recaudo del Turno</p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-3 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-emerald-400 block mb-2">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(accumulatedRevenue)}
                </span>
                <button
                  onClick={handleCloseRegister}
                  disabled={isClosingRegister || accumulatedRevenue === 0}
                  className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-3xl text-xs font-bold transition-colors truncate shadow-sm"
                >
                  {isClosingRegister ? "Cerrando..." : "Cerrar Caja"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPreferences(true)}
            className="flex items-center gap-3 px-5 py-3 rounded-3xl text-slate-500 hover:bg-slate-100 transition-colors w-full mb-2"
          >
            <Menu size={20} />
            <span className="font-bold">Preferencias</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-3 rounded-3xl text-red-400 hover:bg-red-400/10 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-bold">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50  relative">
        <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 xl:p-12 pb-24 md:pb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl flex items-center gap-3">
              <X size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && <SuccessMessage message={success} />}

          {/* TAB: OPERATION */}
          {activeTab === "operation" && (
            <div className="flex flex-col gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Resumen Rápido */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">
                      Vehículos Parqueados
                    </p>
                    <p className="text-3xl font-black text-slate-900 ">
                      {activeSessions.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-3xl flex items-center justify-center border border-indigo-100">
                    <Car size={24} />
                  </div>
                </div>

                <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">
                      Suscripciones Activas
                    </p>
                    <p className="text-3xl font-black text-emerald-600">
                      {subscribers.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 size={24} />
                  </div>
                </div>

                <div className="bg-white  p-6 rounded-3xl shadow-md border border-slate-100  flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">
                      Vehículos Vetados
                    </p>
                    <p className="text-3xl font-black text-red-600">
                      {blacklistedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center border border-red-100">
                    <AlertTriangle size={24} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
                {/* Entry Form */}
                <div className="xl:w-[380px] shrink-0 bg-white  p-6 lg:p-8 rounded-3xl shadow-md border border-slate-100  h-fit">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3.5 bg-slate-100 text-slate-800 rounded-3xl ring-1 ring-indigo-100">
                      <LogIn size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900  tracking-tight">
                      Nuevo Ingreso
                    </h2>
                  </div>

                  <form onSubmit={handleEntrySubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700  mb-2">
                        Placa *
                      </label>
                      <div className="relative flex items-center gap-3">
                        <div className="relative flex-1 group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <div className="w-8 h-6 bg-yellow-400 rounded-sm flex items-center justify-center shadow-md border border-slate-100 border border-yellow-500">
                              <span className="text-[10px] font-black text-slate-900  tracking-tighter">
                                COL
                              </span>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={plate || ""}
                            onChange={(e) => handleSearchPlate(e.target.value.toUpperCase())}
                            className="w-full pl-14 pr-4 py-4 md:py-5 bg-slate-50  border border-slate-200  group-hover:border-slate-300  rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white  outline-none uppercase font-mono text-2xl sm:text-3xl font-black tracking-widest text-slate-900  transition-all shadow-inner placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal text-center"
                            placeholder="ABC-123"
                            maxLength={7}
                            required
                          />
                        </div>
                      </div>
                      {!isNewVehicle && plate.length >= 5 && (
                        <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1.5 px-1 bg-emerald-50 w-fit py-1 px-2 rounded-3xl border border-emerald-100">
                          <CheckCircle2 size={14} /> Vehículo registrado
                          anteriormente
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700  mb-2">
                        Tipo de Vehículo *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {parkingLot?.allowed_vehicles?.map((v: string) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setType(v)}
                            className={`p-4 md:p-5 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${
                              type === v
                                ? "bg-slate-100 border-indigo-500 text-slate-700 shadow-md border border-slate-100 scale-[1.02]"
                                : "bg-white  border-slate-200  text-slate-500 hover:border-slate-300  hover:bg-slate-50 "
                            }`}
                          >
                            {v.toLowerCase() === "carros" ? (
                              <Car size={32} />
                            ) : v.toLowerCase() === "motos" ? (
                              <Bike size={32} />
                            ) : (
                              <Truck size={32} />
                            )}
                            <span className="font-extrabold capitalize text-base md:text-lg">
                              {v}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Fields */}
                    {parkingLot?.custom_fields?.map(
                      (field: any, idx: number) => (
                        <div key={idx}>
                          <label className="block text-sm font-bold text-slate-700  mb-1">
                            {field.name} {field.required && "*"}
                          </label>
                          <input
                            type="text"
                            value={extraData[field.name] || ""}
                            onChange={(e) => {
                              const val = field.name.toLowerCase().includes("placa")
                                ? e.target.value.toUpperCase()
                                : e.target.value;
                              setExtraData({
                                ...extraData,
                                [field.name]: val,
                              });
                            }}
                            className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder={`Ingresar ${field.name.toLowerCase()}`}
                            required={field.required}
                          />
                        </div>
                      ),
                    )}

                    {prefShowNotes && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-bold text-slate-700">
                            Observaciones{" "}
                            {prefRequirePhoto
                              ? "(Obligatorio con foto)"
                              : "(Opcional)"}
                          </label>
                          {previousObservation && (
                            <label className="flex items-center gap-2 text-sm text-indigo-600 font-medium cursor-pointer bg-indigo-50 px-2 py-1 rounded-xl">
                              <input
                                type="checkbox"
                                checked={usePreviousObservation}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setUsePreviousObservation(checked);
                                  if (checked) {
                                    setExtraData({
                                      ...extraData,
                                      ["Observaciones"]: previousObservation.text || "",
                                    });
                                    if (previousObservation.photoUrl) {
                                      setPhotoDataUrl(previousObservation.photoUrl);
                                      setPhotoFile(null); // Clear any newly taken file
                                    }
                                  } else {
                                    setExtraData({
                                      ...extraData,
                                      ["Observaciones"]: "",
                                    });
                                    if (photoDataUrl === previousObservation.photoUrl) {
                                      setPhotoDataUrl(null);
                                    }
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-indigo-300"
                              />
                              Usar novedad anterior
                            </label>
                          )}
                        </div>
                        <textarea
                          value={extraData["Observaciones"] || ""}
                          onChange={(e) =>
                            setExtraData({
                              ...extraData,
                              ["Observaciones"]: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-slate-200  rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-3"
                          placeholder="Daños, rayones o notas importantes..."
                          rows={2}
                          required={prefRequirePhoto && !usePreviousObservation}
                        />
                        {prefRequirePhoto && (
                          <div className="flex flex-col gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              ref={photoInputRef}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPhotoFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPhotoDataUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-3xl font-bold transition-colors flex items-center justify-center gap-3 border border-slate-200"
                              >
                                <Camera size={20} />
                                {photoDataUrl
                                  ? "Volver a tomar foto"
                                  : "Tomar foto"}
                              </button>
                            </div>
                            {photoDataUrl && (
                              <div className="mt-2 relative rounded-3xl overflow-hidden border border-slate-200 max-h-48 flex justify-center bg-slate-50">
                                <Image
                                  src={photoDataUrl}
                                  alt="Observación"
                                  width={400}
                                  height={300}
                                  className="w-auto h-full max-h-48 object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhotoDataUrl(null);
                                    setPhotoFile(null);
                                    if (photoInputRef.current)
                                      photoInputRef.current.value = "";
                                  }}
                                  className="absolute top-3 right-2 p-1.5 bg-red-500 text-slate-900 rounded-full hover:bg-red-600 transition-colors shadow-md border border-slate-100"
                                  title="Eliminar foto"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingEntry}
                      className={`${styles.btnPrimary} mt-6 py-4 md:py-5 text-lg w-full active:scale-[0.98]`}
                    >
                      {isSubmittingEntry ? (
                        <Spinner size={24} className="text-white" />
                      ) : (
                        <LogIn size={24} />
                      )}
                      {isSubmittingEntry ? "Registrando..." : "Dar Ingreso"}
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="flex-1 bg-white  p-6 lg:p-8 rounded-3xl shadow-md border border-slate-100  min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-3xl ring-1 ring-emerald-100">
                        <Car size={24} />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900  tracking-tight flex items-center gap-3">
                        Parqueadero
                        <span className="bg-slate-100 text-slate-600  text-sm font-bold px-2.5 py-0.5 rounded-full">
                          {activeSessions.length}
                        </span>
                      </h2>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar placa activa..."
                            value={activeSearchQuery}
                            onChange={(e) => setActiveSearchQuery(e.target.value.toUpperCase())}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                        />
                    </div>
                  </div>

                  {filteredActiveSessions.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-200  rounded-3xl bg-slate-50 ">
                      <Car size={48} className="mx-auto text-slate-500 mb-4" />
                      <p className="text-slate-500 font-bold">
                        {activeSearchQuery ? "No se encontraron vehículos con esa placa." : "No hay vehículos en el parqueadero."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredActiveSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`border border-slate-200  p-4 rounded-3xl flex flex-col justify-between gap-4 transition-all bg-slate-50  ${viewingSession?.id === session.id ? "border-indigo-400 shadow-md border border-slate-100 ring-1 ring-indigo-400" : "hover:border-indigo-300 hover:shadow-md border border-slate-100"}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div
                              className="flex items-center gap-4 cursor-pointer flex-1 group"
                              onClick={() =>
                                setViewingSession(
                                  viewingSession?.id === session.id
                                    ? null
                                    : session,
                                )
                              }
                            >
                              <div className="w-20 h-16 bg-white  rounded-3xl flex items-center justify-center font-mono font-bold text-lg text-slate-800  border-2 border-slate-200  shadow-md border border-slate-100 shrink-0 group-hover:border-indigo-300 transition-colors">
                                {session.vehicles.plate}
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <p className="font-extrabold text-slate-900  capitalize">
                                    {session.vehicles.type}
                                  </p>
                                  {subscribers.some(
                                    (sub) =>
                                      sub.plate === session.vehicles.plate,
                                  ) && (
                                    <span className="bg-indigo-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                      Abonado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                  <Clock size={14} />
                                  <span>
                                    {new Date(
                                      session.entry_time,
                                    ).toLocaleString("es-CO", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span
                                    className={`ml-2 text-xs font-bold transition-colors ${viewingSession?.id === session.id ? "text-slate-800" : "text-slate-400 group-hover:text-indigo-500"}`}
                                  >
                                    {viewingSession?.id === session.id
                                      ? "(Ocultar detalles)"
                                      : "(Ver detalles)"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 border-t sm:border-0 pt-4 sm:pt-0 border-slate-100 ">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden sm:block">
                                  Cobro:
                                </span>
                                <div className="bg-slate-50  border border-slate-200  rounded-3xl py-3 px-3 flex items-center shadow-md border border-slate-100 w-full sm:w-auto overflow-hidden">
                                  <span className="text-slate-400 font-bold mr-1.5">
                                    $
                                  </span>
                                  <span
                                    className={`text-base font-black truncate tracking-tight ${subscribers.some((sub) => sub.plate === session.vehicles.plate) ? "text-emerald-500" : "text-slate-700 "}`}
                                  >
                                    {(subscribers.some(
                                      (sub) =>
                                        sub.plate === session.vehicles.plate,
                                    )
                                      ? 0
                                      : calculateFee(
                                          new Date(session.entry_time),
                                          new Date(),
                                          tariffs.filter(
                                            (t) =>
                                              t.vehicle_type ===
                                              session.vehicles.type,
                                          ),
                                          {
                                            entry_grace_period_mins:
                                              parkingLot.entry_grace_period_mins,
                                            shift_grace_period_mins:
                                              parkingLot.shift_grace_period_mins,
                                          },
                                        )
                                    ).toLocaleString("es-CO")}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExit(session.id);
                                }}
                                disabled={isSubmittingExit === session.id}
                                className={`${styles.btnPrimary} px-6 py-3.5 flex items-center justify-center gap-3 w-full sm:w-auto whitespace-nowrap shrink-0 hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-400`}
                              >
                                {isSubmittingExit === session.id ? (
                                  <>
                                    <Spinner
                                      size={16}
                                      className="text-white"
                                    />
                                    <span className="inline">Saliendo...</span>
                                  </>
                                ) : (
                                  "Dar Salida"
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Dropdown Extra Data / Entry Summary */}
                          {viewingSession?.id === session.id && (
                            <div className="mt-2 text-sm border-t border-slate-200  pt-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex justify-between items-center bg-white  p-3 rounded-3xl border border-slate-100 ">
                                  <span className="text-slate-500">
                                    Registrado por:
                                  </span>
                                  <span className="font-bold text-slate-800 ">
                                    {session.entry_employee_name || "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-white  p-3 rounded-3xl border border-slate-100 ">
                                  <span className="text-slate-500">
                                    Hora Entrada:
                                  </span>
                                  <span className="font-bold text-slate-800 text-right">
                                    {new Date(
                                      session.entry_time,
                                    ).toLocaleString("es-CO", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-white  p-3 rounded-3xl border border-slate-100 ">
                                  <span className="text-slate-500">
                                    Tiquete de Ingreso:
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingSession(session);
                                    }}
                                    className="text-indigo-600 font-bold hover:underline text-sm flex items-center gap-1"
                                    title="Imprimir Tiquete de Ingreso"
                                  >
                                    <Printer size={14} />
                                    <span>Ver / Imprimir</span>
                                  </button>
                                </div>
                              </div>

                              {/* Custom Fields */}
                              {((session.vehicles.custom_fields_data &&
                                Object.keys(session.vehicles.custom_fields_data)
                                  .length > 0) ||
                                (session.extra_data &&
                                  Object.keys(session.extra_data).length >
                                    0)) && (
                                <div className="bg-white  p-3 rounded-3xl border border-slate-100  mt-2">
                                  <span className="text-slate-500 block mb-2 font-bold">
                                    Datos Extra:
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.entries({
                                      ...session.vehicles.custom_fields_data,
                                      ...session.extra_data,
                                    }).map(([k, v]) => (
                                      <div
                                        key={k}
                                        className="text-xs bg-slate-50  p-3 rounded border border-slate-100 "
                                      >
                                        <span className="font-bold block text-slate-500 uppercase mb-[2px] text-[10px] tracking-wide">
                                          {k}
                                        </span>
                                        <span className="text-slate-900  font-bold">
                                          {v as string}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === "history" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <EmployeeHistory
                parkingLot={parkingLot}
                tariffs={tariffs}
                onExitSession={handleExit}
              />
            </div>
          )}

          {/* TAB: PRIVATE SPACES */}
          {/* TAB: INSPECTIONS */}
          {activeTab === "inspections" && parkingLot && profile && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InspectionsTab parkingLot={parkingLot} profile={profile} />
            </div>
          )}

          {activeTab === "private" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PrivateSpaces parkingLotId={parkingLot.id} />
            </div>
          )}

          {/* Receipt Modal */}
          {showReceipt && selectedSession && (
            <ReceiptModal
              session={selectedSession}
              appSettings={appSettings}
              parkingLot={parkingLot}
              onClose={() => setShowReceipt(false)}
            />
          )}

          {/* Info Modal */}
          {viewingSession && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 print:absolute print:inset-0 print:bg-transparent print:p-0 print:block">
              <div
                id="printable-receipt"
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print:shadow-none print:max-w-none print:w-full print:p-0 flex flex-col print:h-auto print:block print:m-0"
              >
                <div className="bg-white border-r border-slate-200 border-b border-slate-200 p-4 flex justify-between items-center text-slate-900 print:border-none print:pb-2 print:mb-4 print:border-b print:border-dashed print:border-slate-300">
                  <div className="flex flex-col w-full text-center sm:text-left print:text-center">
                    <div className="hidden print:flex flex-col items-center justify-center mb-4">
                      {parkingLot?.logo_url || appSettings?.logo_url ? (
                        <Image
                          src={parkingLot?.logo_url || appSettings?.logo_url}
                          alt="Logo"
                          width={80}
                          height={80}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-2 border-2 border-slate-100 shadow-xl"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-xl border border-slate-100">
                          <Car size={32} />
                        </div>
                      )}
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wider">
                        {appSettings?.app_name || parkingLot?.name || "Parqueadero"}
                      </h2>
                    </div>
                    <h3 className="text-lg font-bold font-mono print:text-slate-900">
                      Tiquete Vehículo - {viewingSession.vehicles.plate}
                    </h3>
                  </div>
                  <button
                    onClick={() => setViewingSession(null)}
                    className="p-1 hover:bg-indigo-900 rounded-3xl transition-colors print:hidden"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50  p-3 rounded-3xl border border-slate-100 ">
                      <p className="text-xs text-slate-500 font-bold mb-1">
                        Tipo
                      </p>
                      <p className="font-extrabold text-slate-900  capitalize">
                        {viewingSession.vehicles.type}
                      </p>
                    </div>
                    <div className="bg-slate-50  p-3 rounded-3xl border border-slate-100 ">
                      <p className="text-xs text-slate-500 font-bold mb-1">
                        Hora Ingreso
                      </p>
                      <p className="font-extrabold text-slate-900 ">
                        {new Date(viewingSession.entry_time).toLocaleString("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {viewingSession.entry_employee_name && (
                      <div className="bg-slate-50  p-3 rounded-3xl border border-slate-100  col-span-2">
                        <p className="text-xs text-slate-500 font-bold mb-1">
                          Registrado por
                        </p>
                        <p className="font-extrabold text-slate-900 ">
                          {viewingSession.entry_employee_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {viewingSession.extra_data &&
                    Object.keys(viewingSession.extra_data).length > 0 && (
                      <div className="bg-slate-100/50 p-4 rounded-3xl border border-indigo-100 space-y-2 mt-4">
                        <h4 className="font-extrabold text-indigo-900 text-sm mb-3">
                          Información Adicional
                        </h4>
                        {Object.entries(viewingSession.extra_data).map(
                          ([k, v]) => {
                            if (k === "observation_photo_url") {
                              return (
                                <div
                                  key={k}
                                  className="flex flex-col gap-3 border-b border-indigo-100/50 pb-2 last:border-0 last:pb-0"
                                >
                                  <span className="text-slate-600 font-bold">
                                    Foto de Observación
                                  </span>
                                  <a
                                    href={v as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block relative h-48 w-full max-h-48 overflow-hidden rounded-3xl border border-indigo-200 bg-white"
                                  >
                                    <Image
                                      src={v as string}
                                      alt="Observación"
                                      fill
                                      className="object-cover"
                                    />
                                  </a>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={k}
                                className="flex justify-between items-center text-sm border-b border-indigo-100/50 pb-2 last:border-0 last:pb-0"
                              >
                                <span className="text-slate-600  font-bold">
                                  {k}
                                </span>
                                <span className="text-slate-900  font-extrabold">
                                  {v as string}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 print:hidden flex gap-3">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-3xl font-bold transition-colors hover:bg-slate-800 flex justify-center items-center gap-3"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button
                    onClick={() => {
                      const sessionId = viewingSession.id;
                      setViewingSession(null);
                      // Pre-fill the exit form logic
                      setExitPlate(sessionId);
                      const currentFee = calculateFee(
                        new Date(viewingSession.entry_time),
                        new Date(),
                        tariffs.filter(
                          (t) =>
                            t.vehicle_type === viewingSession.vehicles.type,
                        ),
                        {
                          entry_grace_period_mins:
                            parkingLot.entry_grace_period_mins,
                          shift_grace_period_mins:
                            parkingLot.shift_grace_period_mins,
                        },
                      ).toString();
                      setFee(currentFee);
                    }}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-900 rounded-3xl font-bold transition-colors hover:bg-slate-100 flex justify-center items-center gap-3"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              </div>
            </div>
          )}

          {showConfirmEntry && (
            <div className="fixed inset-0 bg-white border-r border-slate-200/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white  rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md border border-slate-100">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900  text-xl mb-2">
                    Confirmar Ingreso
                  </h3>
                  <p className="text-sm text-slate-500 font-bold">
                    ¿Estás seguro de registrar el ingreso de la placa{" "}
                    <span className="text-slate-900  font-bold uppercase">
                      {plate}
                    </span>
                    ?
                  </p>
                </div>
                <div className="p-5 bg-slate-50  border-t border-slate-100  flex gap-3 justify-center">
                  <button
                    onClick={() => setShowConfirmEntry(false)}
                    className={`${styles.btnSecondary} w-full`}
                    disabled={isSubmittingEntry}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={processEntry}
                    className={`${styles.btnPrimary} w-full flex items-center justify-center gap-3 active:scale-95`}
                    disabled={isSubmittingEntry}
                  >
                    {isSubmittingEntry ? (
                      <Spinner size={20} className="text-white" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
          {showPreferences && (
            <div className="fixed inset-0 bg-white border-r border-slate-200/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white  rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white border-r border-slate-200 text-slate-900 p-5 flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-3">
                    <Menu size={20} />
                    Preferencias Adicionales
                  </h3>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900  text-sm">
                        Sonidos de Notificación
                      </p>
                      <p className="text-xs text-slate-500">
                        Pitidos al guardar ingresos y mostrar errores
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={prefSound}
                        onChange={(e) =>
                          savePref("pref_sound", e.target.checked)
                        }
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white  after:border-slate-300  after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                    </label>
                  </div>
                </div>
                <div className="p-4 bg-slate-50  border-t border-slate-100 ">
                  <button
                    onClick={() => setShowPreferences(false)}
                    className={`${styles.btnPrimary} w-full`}
                  >
                    Cerrar y Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
