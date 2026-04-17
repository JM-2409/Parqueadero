"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Car, LogOut, LogIn, Search, CheckCircle2, DollarSign, Clock, Receipt, User, History, Menu, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import EmployeeHistory from "./EmployeeHistory";
import ReceiptModal from "./ReceiptModal";
import { calculateFee } from "@/lib/pricing";

import { sanitizeInput } from "@/lib/sanitize";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function EmployeePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("operation"); // operation, history
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Shift state
  const [shiftName, setShiftName] = useState("");
  const [isShiftSet, setIsShiftSet] = useState(false);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Receipt Modal
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [viewingSession, setViewingSession] = useState<any>(null);

  // Entry form states
  const [plate, setPlate] = useState("");
  const [debouncedPlate, setDebouncedPlate] = useState("");
  const [type, setType] = useState("carros");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [isNewVehicle, setIsNewVehicle] = useState(true);
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Exit form states
  const [exitPlate, setExitPlate] = useState("");
  const [fee, setFee] = useState("");

  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState<string | null>(null);
  const [accumulatedRevenue, setAccumulatedRevenue] = useState(0);

  const fetchParkingLot = useCallback(async (id: string) => {
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
    }
    
    // Fetch last closure to calculate accumulated revenue
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
      const revenue = shiftData.reduce((sum, s) => sum + (Number(s.total_charged) || 0), 0);
      setAccumulatedRevenue(revenue);
    }

    const { data: appData } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    if (appData) setAppSettings(appData);

    const { data: tariffData } = await supabase.from("tariffs").select("*").eq("parking_lot_id", id);
    if (tariffData) setTariffs(tariffData);

    setLoading(false);
  }, []);

  const fetchActiveSessions = useCallback(async (parkingLotId: string) => {
    const { data } = await supabase
      .from("parking_sessions")
      .select("*, vehicles(*)")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "active")
      .order("entry_time", { ascending: false });
    setActiveSessions(data || []);
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, parking_lots(*)")
        .eq("id", session.user.id)
        .single();

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
    } catch (err) {
      console.error("Error checking user:", err);
      router.push("/login");
    }
  }, [router, fetchParkingLot, fetchActiveSessions]);

  useEffect(() => {
    // Check for saved shift
    const savedShift = sessionStorage.getItem("shiftName");
    if (savedShift) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShiftName(savedShift);
      setIsShiftSet(true);
    }
    
    checkUser();
  }, [checkUser]);

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
          setType(data.type);
          setBrand(data.brand || "");
          setColor(data.color || "");
          setOwnerName(data.owner_name || "");
          if (data.custom_fields_data) setExtraData(data.custom_fields_data);
          setIsNewVehicle(false);
        } else {
          setIsNewVehicle(true);
        }
      } else {
        setIsNewVehicle(true);
      }
    };
    searchVehicle();
  }, [debouncedPlate]);

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (shiftName.trim()) {
      sessionStorage.setItem("shiftName", shiftName.trim());
      setIsShiftSet(true);
    }
  };

  const handleSearchPlate = (searchPlate: string) => {
    setPlate(searchPlate);
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEntry) return;
    setIsSubmittingEntry(true);
    setError("");
    setSuccess("");

    if (!plate || !type) {
      setError("Placa y tipo son obligatorios");
      setIsSubmittingEntry(false);
      return;
    }

    // Check capacity
    if (activeSessions.length >= parkingLot.capacity) {
      setError("El parqueadero está lleno");
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
        .insert([{
            plate: sanitizeInput(plate.toUpperCase()),
            type,
            brand: sanitizeInput(brand),
            color: sanitizeInput(color),
            owner_name: sanitizeInput(ownerName),
            custom_fields_data: extraData
        }])
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
        .select("id")
        .eq("plate", plate.toUpperCase())
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
        await supabase.from("vehicles").update({ custom_fields_data: extraData }).eq("id", vehicleId);
      }
    }

    if (vehicleId) {
      // Sanitize extraData
      const sanitizedExtraData: Record<string, any> = {};
      Object.keys(extraData).forEach(key => {
        if (typeof extraData[key] === 'string') {
          sanitizedExtraData[key] = sanitizeInput(extraData[key]);
        } else {
          sanitizedExtraData[key] = extraData[key];
        }
      });

      const { error: sessionError } = await supabase
        .from("parking_sessions")
        .insert([{
            parking_lot_id: parkingLot.id,
            vehicle_id: vehicleId,
            status: "active",
            entry_employee_name: shiftName,
            extra_data: sanitizedExtraData
        }]);

      if (sessionError) {
        setError("Error al registrar ingreso");
      } else {
        setSuccess("Ingreso registrado exitosamente");
        setPlate("");
        setDebouncedPlate("");
        setBrand("");
        setColor("");
        setOwnerName("");
        setExtraData({});
        setIsNewVehicle(true);
        await fetchActiveSessions(parkingLot.id);
        setTimeout(() => setSuccess(""), 3000);
      }
    }
    setIsSubmittingEntry(false);
  };

  const handleExit = async (sessionId: string) => {
    if (isSubmittingExit === sessionId) return;
    setIsSubmittingExit(sessionId);
    setError("");
    setSuccess("");

    const sessionToExit = activeSessions.find(s => s.id === sessionId);
    if (!sessionToExit) {
      setIsSubmittingExit(null);
      return;
    }

    const entryTime = new Date(sessionToExit.entry_time);
    const exitTime = new Date();
    const tariff = tariffs.find(t => t.vehicle_type === sessionToExit.vehicles.type);
    
    // Auto-calculate fee if not manually entered
    let finalFee = Number(fee);
    if (exitPlate !== sessionId || !fee || isNaN(finalFee)) {
      finalFee = calculateFee(entryTime, exitTime, tariff);
    }

    // Generar consecutivo usando sequence property si se quiere, o autocalculado
    const { data: lotData } = await supabase.from('parking_lots').select('receipt_sequence').eq('id', parkingLot.id).single();
    const nextSeq = (lotData?.receipt_sequence || 0) + 1;
    await supabase.from('parking_lots').update({ receipt_sequence: nextSeq }).eq('id', parkingLot.id);

    const receiptNumber = `REC-${nextSeq.toString().padStart(6, '0')}`;
    const durationMinutes = Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({
        status: "completed",
        exit_time: exitTime.toISOString(),
        fee: finalFee,
        total_charged: finalFee,
        receipt_number: receiptNumber,
        duration_minutes: durationMinutes,
        exit_employee_name: shiftName
      })
      .eq("id", sessionId)
      .select("*, vehicles(*)")
      .single();

    if (updateError) {
      setError("Error al registrar salida");
    } else {
      setSuccess("Salida registrada exitosamente");
      setExitPlate("");
      setFee("");
      await fetchActiveSessions(parkingLot.id);
      setSelectedSession(updatedSession);
      setShowReceipt(true);
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsSubmittingExit(null);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("shiftName");
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando...</div>;

  // SHIFT MODAL
  if (!isShiftSet) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Inicio de Turno</h2>
          <p className="text-center text-slate-500 mb-6">Por favor, ingresa tu nombre para registrar quién está operando el sistema.</p>
          
          <form onSubmit={handleStartShift}>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg text-center mb-4"
              required
            />
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-indigo-200"
            >
              Comenzar Turno
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Car size={24} className="text-indigo-400" />
          <span className="truncate max-w-[150px]">{parkingLot?.name}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:min-h-screen sticky top-0 z-10`}>
        <div className="p-6 hidden md:flex items-center gap-3 font-bold text-xl text-white border-b border-slate-800">
          <Car size={28} className="text-indigo-400" />
          <span>Operación</span>
        </div>
        
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Turno Actual</p>
          <div className="flex items-center gap-2 text-white bg-slate-800 p-2 rounded-lg">
            <User size={16} className="text-indigo-400" />
            <span className="font-medium truncate">{shiftName}</span>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => { setActiveTab("operation"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "operation" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <LogIn size={20} />
            <span className="font-medium">Ingreso / Salida</span>
          </button>
          <button
            onClick={() => { setActiveTab("history"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "history" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <History size={20} />
            <span className="font-medium">Historial</span>
          </button>
        </nav>
        
        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-xs text-slate-500 mb-1">Ocupación</p>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${(activeSessions.length / parkingLot?.capacity) * 100}%` }}></div>
            </div>
            <p className="text-xs text-right mt-1">{activeSessions.length} / {parkingLot?.capacity}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Turno</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <X size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && <SuccessMessage message={success} />}

          {/* TAB: OPERATION */}
          {activeTab === "operation" && (
            <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Entry Form */}
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <LogIn size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Registrar Ingreso</h2>
                </div>

                <form onSubmit={handleEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={plate}
                        onChange={(e) => handleSearchPlate(e.target.value)}
                        className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono text-lg"
                        placeholder="ABC-123"
                        maxLength={7}
                        required
                      />
                      <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    </div>
                    {!isNewVehicle && plate.length >= 5 && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Vehículo encontrado
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Vehículo *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white capitalize"
                    >
                      {parkingLot?.allowed_vehicles?.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Fields */}
                  {parkingLot?.custom_fields?.map((field: any, idx: number) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.name} {field.required && '*'}
                      </label>
                      <input
                        type="text"
                        value={extraData[field.name] || ""}
                        onChange={(e) => setExtraData({...extraData, [field.name]: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder={`Ingresar ${field.name.toLowerCase()}`}
                        required={field.required}
                      />
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-100 mt-4">
                    <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Datos Opcionales</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Marca (Ej. Toyota)"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Color (Ej. Rojo)"
                      />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Propietario"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEntry}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-6 shadow-md shadow-indigo-200"
                  >
                    {isSubmittingEntry ? (
                      <Spinner size={20} className="text-white" />
                    ) : (
                      <LogIn size={20} />
                    )}
                    {isSubmittingEntry ? "Registrando..." : "Dar Ingreso"}
                  </button>
                </form>
              </div>

              {/* Active Sessions */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                      <Car size={24} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">Vehículos en Parqueadero</h2>
                  </div>
                  {parkingLot?.show_revenue && (
                    <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-100">
                      <DollarSign size={16} />
                      <span className="font-bold">
                        Recaudo Actual: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(accumulatedRevenue)}
                      </span>
                    </div>
                  )}
                </div>

                {activeSessions.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <Car size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No hay vehículos en el parqueadero.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`border border-slate-200 p-4 rounded-xl flex flex-col justify-between gap-4 transition-all bg-slate-50/50 ${viewingSession?.id === session.id ? 'border-indigo-400 shadow-md ring-1 ring-indigo-400' : 'hover:border-indigo-300 hover:shadow-sm'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div 
                            className="flex items-center gap-4 cursor-pointer flex-1 group"
                            onClick={() => setViewingSession(viewingSession?.id === session.id ? null : session)}
                          >
                            <div className="w-20 h-16 bg-white rounded-lg flex items-center justify-center font-mono font-bold text-lg text-slate-800 border-2 border-slate-200 shadow-sm shrink-0 group-hover:border-indigo-300 transition-colors">
                              {session.vehicles.plate}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 capitalize">{session.vehicles.type}</p>
                              <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                <Clock size={14} />
                                <span>{new Date(session.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className={`ml-2 text-xs font-medium transition-colors ${viewingSession?.id === session.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                  {viewingSession?.id === session.id ? "(Ocultar detalles)" : "(Ver detalles)"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <div className="relative flex-1 sm:w-32 hidden lg:block">
                              <span className="absolute left-3 top-2.5 text-slate-500 font-medium">$</span>
                              <input
                                type="number"
                                value={exitPlate === session.id ? fee : calculateFee(new Date(session.entry_time), new Date(), tariffs.find(t => t.vehicle_type === session.vehicles.type)).toString()}
                                placeholder="Cobro"
                                className="w-full p-2 pl-7 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium bg-white"
                                onChange={(e) => {
                                  setExitPlate(session.id);
                                  setFee(e.target.value);
                                }}
                              />
                            </div>
                            <button
                              onClick={() => handleExit(session.id)}
                              disabled={isSubmittingExit === session.id}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                            >
                              {isSubmittingExit === session.id ? (
                                <>
                                  <Spinner size={16} className="text-white" />
                                  <span className="hidden sm:inline">Procesando...</span>
                                </>
                              ) : (
                                "Dar Salida"
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Extra Data / Entry Summary */}
                        {viewingSession?.id === session.id && (
                          <div className="mt-2 text-sm border-t border-slate-200 pt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                                 <span className="text-slate-500">Registrado por:</span>
                                 <span className="font-medium text-slate-800">{session.entry_employee_name || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                                 <span className="text-slate-500">Hora Entrada:</span>
                                 <span className="font-medium text-slate-800">{new Date(session.entry_time).toLocaleString()}</span>
                               </div>
                               <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                                 <span className="text-slate-500">Tiquete Actual:</span>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     // Quick hack to print modal: since they asked not to use modal, maybe just generate receipt PDF?
                                     // Actually they said "sin tener que ir al modal" to see extra details. So they still need it for printing the finalized receipt? No wait, receipt is generated after exit. Right now it's an "active" session.
                                     // I'll leave a small print functionality inside or just keep it simple.
                                     alert("El recibo oficial se genera al darle salida.");
                                   }}
                                   className="text-indigo-600 font-medium hover:underline text-xs"
                                 >
                                   Pendiente factura
                                 </button>
                               </div>
                             </div>
                             
                             {/* Custom Fields */}
                             {(session.vehicles.custom_fields_data && Object.keys(session.vehicles.custom_fields_data).length > 0 || session.extra_data && Object.keys(session.extra_data).length > 0) && (
                               <div className="bg-white p-3 rounded-lg border border-slate-100 mt-2">
                                 <span className="text-slate-500 block mb-2 font-medium">Datos Extra:</span>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries({...session.vehicles.custom_fields_data, ...session.extra_data}).map(([k, v]) => (
                                      <div key={k} className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                        <span className="font-medium block text-slate-500 uppercase mb-[2px] text-[10px] tracking-wide">{k}</span>
                                        <span className="text-slate-900 font-medium">{v as string}</span>
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
          )}

          {/* TAB: HISTORY */}
          {activeTab === "history" && parkingLot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <EmployeeHistory parkingLotId={parkingLot.id} showRevenue={parkingLot.show_revenue} />
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 border-b border-slate-200 p-4 flex justify-between items-center text-white">
                  <h3 className="text-lg font-bold font-mono">
                    Tiquete Vehículo - {viewingSession.vehicles.plate}
                  </h3>
                  <button 
                    onClick={() => setViewingSession(null)}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Tipo</p>
                      <p className="font-semibold text-slate-900 capitalize">{viewingSession.vehicles.type}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Hora Ingreso</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(viewingSession.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    {viewingSession.entry_employee_name && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                        <p className="text-xs text-slate-500 font-medium mb-1">Registrado por</p>
                        <p className="font-semibold text-slate-900">{viewingSession.entry_employee_name}</p>
                      </div>
                    )}
                  </div>
                  
                  {viewingSession.extra_data && Object.keys(viewingSession.extra_data).length > 0 && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2 mt-4">
                      <h4 className="font-semibold text-indigo-900 text-sm mb-3">Información Adicional</h4>
                      {Object.entries(viewingSession.extra_data).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center text-sm border-b border-indigo-100/50 pb-2 last:border-0 last:pb-0">
                          <span className="text-slate-600 font-medium">{k}</span>
                          <span className="text-slate-900 font-semibold">{v as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <button
                    onClick={() => {
                      const sessionId = viewingSession.id;
                      setViewingSession(null);
                      // Pre-fill the exit form logic
                      setExitPlate(sessionId);
                      const currentFee = calculateFee(new Date(viewingSession.entry_time), new Date(), tariffs.find(t => t.vehicle_type === viewingSession.vehicles.type)).toString();
                      setFee(currentFee);
                      
                      // Focus the input if possible or handle exit directly? 
                      // The prompt said "ver el resumen sin tener que ir al modal de recibo", so they can read and then click close or proceed.
                    }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold transition-colors hover:bg-slate-100 flex justify-center items-center gap-2"
                  >
                    Cerrar Detalle
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
