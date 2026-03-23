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

  // Entry form states
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("carros");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [isNewVehicle, setIsNewVehicle] = useState(true);
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Exit form states
  const [exitPlate, setExitPlate] = useState("");
  const [fee, setFee] = useState("");

  const fetchParkingLot = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("parking_lots")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setParkingLot(data);
      if (data.allowed_vehicles && data.allowed_vehicles.length > 0) {
        setType(data.allowed_vehicles[0]);
      }
    }
    
    const { data: appData } = await supabase.from("app_settings").select("*").limit(1).single();
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileData?.role !== "employee") {
      router.push("/");
      return;
    }

    setProfile(profileData);
    fetchParkingLot(profileData.parking_lot_id);
    fetchActiveSessions(profileData.parking_lot_id);
  }, [router, fetchParkingLot, fetchActiveSessions]);

  useEffect(() => {
    // Check for saved shift
    const savedShift = sessionStorage.getItem("shiftName");
    if (savedShift) {
      setShiftName(savedShift);
      setIsShiftSet(true);
    }
    
    checkUser();
  }, [checkUser]);

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (shiftName.trim()) {
      sessionStorage.setItem("shiftName", shiftName.trim());
      setIsShiftSet(true);
    }
  };

  const handleSearchPlate = async (searchPlate: string) => {
    setPlate(searchPlate);
    if (searchPlate.length >= 5) {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("plate", searchPlate.toUpperCase())
        .single();

      if (data) {
        setType(data.type);
        setBrand(data.brand || "");
        setColor(data.color || "");
        setOwnerName(data.owner_name || "");
        setIsNewVehicle(false);
      } else {
        setIsNewVehicle(true);
      }
    } else {
      setIsNewVehicle(true);
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!plate || !type) {
      setError("Placa y tipo son obligatorios");
      return;
    }

    // Check capacity
    if (activeSessions.length >= parkingLot.capacity) {
      setError("El parqueadero está lleno");
      return;
    }

    let vehicleId = null;

    if (isNewVehicle) {
      const { data: newVehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert([{
            plate: plate.toUpperCase(),
            type,
            brand,
            color,
            owner_name: ownerName,
        }])
        .select()
        .single();

      if (vehicleError) {
        setError("Error al registrar vehículo: " + vehicleError.message);
        return;
      }
      vehicleId = newVehicle.id;
    } else {
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", plate.toUpperCase())
        .single();
      vehicleId = existingVehicle?.id;
    }

    if (vehicleId) {
      const { error: sessionError } = await supabase
        .from("parking_sessions")
        .insert([{
            parking_lot_id: parkingLot.id,
            vehicle_id: vehicleId,
            status: "active",
            entry_employee_name: shiftName,
            extra_data: extraData
        }]);

      if (sessionError) {
        setError("Error al registrar ingreso");
      } else {
        setSuccess("Ingreso registrado exitosamente");
        setPlate("");
        setBrand("");
        setColor("");
        setOwnerName("");
        setExtraData({});
        setIsNewVehicle(true);
        fetchActiveSessions(parkingLot.id);
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  };

  const handleExit = async (sessionId: string) => {
    setError("");
    setSuccess("");

    const sessionToExit = activeSessions.find(s => s.id === sessionId);
    if (!sessionToExit) return;

    const entryTime = new Date(sessionToExit.entry_time);
    const exitTime = new Date();
    const tariff = tariffs.find(t => t.vehicle_type === sessionToExit.vehicles.type);
    
    // Auto-calculate fee if not manually entered
    let finalFee = Number(fee);
    if (exitPlate !== sessionId || !fee || isNaN(finalFee)) {
      finalFee = calculateFee(entryTime, exitTime, tariff);
    }

    // eslint-disable-next-line react-hooks/purity
    const receiptNumber = `REN${Date.now().toString().slice(-5)}`;

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({
        status: "completed",
        exit_time: exitTime.toISOString(),
        fee: finalFee,
        total_charged: finalFee,
        receipt_number: receiptNumber,
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
      fetchActiveSessions(parkingLot.id);
      setSelectedSession(updatedSession);
      setShowReceipt(true);
      setTimeout(() => setSuccess(""), 3000);
    }
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
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:min-h-screen sticky top-0 z-10`}>
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

        <nav className="p-4 space-y-2">
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
        
        <div className="p-4 mt-auto border-t border-slate-800 absolute bottom-0 w-full">
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

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

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
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-6 shadow-md shadow-indigo-200"
                  >
                    <LogIn size={20} />
                    Dar Ingreso
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
                      <span>Recaudo Visible</span>
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
                        className="border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-300 hover:shadow-sm transition-all bg-slate-50/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-16 bg-white rounded-lg flex items-center justify-center font-mono font-bold text-lg text-slate-800 border-2 border-slate-200 shadow-sm">
                            {session.vehicles.plate}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 capitalize">{session.vehicles.type}</p>
                            <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                              <Clock size={14} />
                              <span>{new Date(session.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            {session.extra_data && Object.keys(session.extra_data).length > 0 && (
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {Object.entries(session.extra_data).map(([k, v]) => (
                                  <span key={k} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                    {k}: {v as string}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                          <div className="relative flex-1 sm:w-32">
                            <span className="absolute left-3 top-2.5 text-slate-500 font-medium">$</span>
                            <input
                              type="number"
                              placeholder={calculateFee(new Date(session.entry_time), new Date(), tariffs.find(t => t.vehicle_type === session.vehicles.type)).toString() || "Cobro"}
                              className="w-full p-2 pl-7 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                              onChange={(e) => {
                                if (exitPlate === session.id)
                                  setFee(e.target.value);
                                else {
                                  setExitPlate(session.id);
                                  setFee(e.target.value);
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleExit(session.id)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap shadow-sm shadow-emerald-200"
                          >
                            Dar Salida
                          </button>
                        </div>
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
        </div>
      </div>
    </div>
  );
}
