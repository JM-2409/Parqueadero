"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isDocUpdateWindowOpen, getTimeRemaining, REQUEST_TYPES } from "@/lib/residential-utils";
import { FileUp, Send, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface ResidentPortalProps {
  residentId: string;
  parkingLotId: string;
}

export default function ResidentPortal({ residentId, parkingLotId }: ResidentPortalProps) {
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [docWindowOpen, setDocWindowOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [newRequest, setNewRequest] = useState({
    type: REQUEST_TYPES.VEHICLE_CHANGE,
    details: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParkingLot();
    fetchRequests();
  }, []);

  const fetchParkingLot = async () => {
    const { data } = await supabase
      .from("parking_lots")
      .select("*")
      .eq("id", parkingLotId)
      .single();
    
    if (data) {
      setParkingLot(data);
      setDocWindowOpen(isDocUpdateWindowOpen(data.doc_update_start, data.doc_update_end));
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("resident_requests")
      .select("*")
      .eq("resident_id", residentId)
      .order("created_at", { ascending: false });
    
    setRequests(data || []);
  };

  const submitRequest = async () => {
    if (!newRequest.details.trim()) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("resident_requests")
      .insert([{
        resident_id: residentId,
        parking_lot_id: parkingLotId,
        type: newRequest.type,
        status: "pending",
        details: { description: newRequest.details }
      }]);
    
    if (!error) {
      setNewRequest({ type: REQUEST_TYPES.VEHICLE_CHANGE, details: "" });
      fetchRequests();
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    return status === "approved" ? "text-green-600" : status === "rejected" ? "text-red-600" : "text-yellow-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Ventana de Actualización de Documentos */}
      {parkingLot?.doc_update_start && (
        <div className={`p-4 rounded-lg border-2 ${docWindowOpen ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {docWindowOpen ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <Clock className="text-gray-600" size={24} />
              )}
              <div>
                <h3 className="font-bold">
                  {docWindowOpen ? "✅ Ventana de Actualización Abierta" : "⏱️ Ventana de Actualización Cerrada"}
                </h3>
                <p className="text-sm text-gray-600">
                  {docWindowOpen ? getTimeRemaining(parkingLot.doc_update_end) : "Espera la próxima ventana"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de Solicitudes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Hacer una Solicitud</h2>
        
        <div className="space-y-4">
          <select 
            value={newRequest.type}
            onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}
            className="w-full border p-2 rounded"
          >
            <option value={REQUEST_TYPES.VEHICLE_CHANGE}>Cambio de Vehículo</option>
            <option value={REQUEST_TYPES.SURRENDER_SPOT}>Entregar Cupo de Parqueo</option>
            <option value={REQUEST_TYPES.LOTTERY_ENTRY}>Participar en Sorteo</option>
            <option value={REQUEST_TYPES.COMMON_AREA}>Alquilar Zona Común</option>
          </select>

          <textarea 
            placeholder="Describe tu solicitud..."
            value={newRequest.details}
            onChange={(e) => setNewRequest({...newRequest, details: e.target.value})}
            className="w-full border p-2 rounded h-24"
          />

          <button 
            onClick={submitRequest}
            disabled={loading || !newRequest.details.trim()}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Send size={18} /> Enviar Solicitud
          </button>
        </div>
      </div>

      {/* Historial de Solicitudes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Mis Solicitudes</h2>
        
        {requests.length === 0 ? (
          <p className="text-gray-500">No tienes solicitudes aún.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="border p-4 rounded-lg hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold capitalize">{req.type.replace(/_/g, " ")}</h3>
                    <p className="text-sm text-gray-600">{req.details?.description}</p>
                    {req.admin_notes && (
                      <p className="text-sm text-blue-600 mt-2">
                        <strong>Nota Admin:</strong> {req.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className={`font-bold capitalize ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
