"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, CheckCircle, XCircle, Download, Eye } from "lucide-react";

interface ResidentialManagementProps {
  parkingLotId: string;
}

export default function ResidentialManagement({ parkingLotId }: ResidentialManagementProps) {
  const [parkingLot, setParkingLot] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [docWindowStart, setDocWindowStart] = useState("");
  const [docWindowEnd, setDocWindowEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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
      setDocWindowStart(data.doc_update_start || "");
      setDocWindowEnd(data.doc_update_end || "");
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("resident_requests")
      .select("*, profiles(email)")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });
    
    setRequests(data || []);
  };

  const updateDocWindow = async () => {
    setLoading(true);
    await supabase
      .from("parking_lots")
      .update({
        doc_update_start: docWindowStart,
        doc_update_end: docWindowEnd
      })
      .eq("id", parkingLotId);
    
    fetchParkingLot();
    setLoading(false);
  };

  const approveRequest = async (requestId: string, notes: string) => {
    await supabase
      .from("resident_requests")
      .update({ status: "approved", admin_notes: notes })
      .eq("id", requestId);
    
    fetchRequests();
    setSelectedRequest(null);
  };

  const rejectRequest = async (requestId: string, notes: string) => {
    await supabase
      .from("resident_requests")
      .update({ status: "rejected", admin_notes: notes })
      .eq("id", requestId);
    
    fetchRequests();
    setSelectedRequest(null);
  };

  const downloadRequests = () => {
    const csv = [
      ["ID", "Residente", "Tipo", "Estado", "Fecha"],
      ...requests.map(r => [
        r.id,
        r.profiles?.email || "N/A",
        r.type,
        r.status,
        new Date(r.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitudes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Configuración de Ventana de Actualización */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar size={24} /> Ventana de Actualización de Documentos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Inicio</label>
            <input 
              type="datetime-local"
              value={docWindowStart}
              onChange={(e) => setDocWindowStart(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Fin</label>
            <input 
              type="datetime-local"
              value={docWindowEnd}
              onChange={(e) => setDocWindowEnd(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={updateDocWindow}
              disabled={loading}
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Guardar Ventana
            </button>
          </div>
        </div>
      </div>

      {/* Gestión de Solicitudes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Solicitudes de Residentes</h2>
          <button 
            onClick={downloadRequests}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
          >
            <Download size={18} /> Descargar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Residente</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{req.profiles?.email}</td>
                  <td className="p-2 capitalize">{req.type.replace(/_/g, " ")}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      req.status === "approved" ? "bg-green-100 text-green-700" :
                      req.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-2">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      <Eye size={14} className="inline" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles y Decisión */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Solicitud de {selectedRequest.profiles?.email}</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Tipo:</strong> {selectedRequest.type.replace(/_/g, " ")}<br/>
              <strong>Detalles:</strong> {selectedRequest.details?.description}
            </p>
            
            <textarea 
              placeholder="Notas de administrador (visible para el residente)"
              className="w-full border p-2 rounded mb-4 h-20"
              id="admin-notes"
            />
            
            <div className="flex gap-2">
              <button 
                onClick={() => approveRequest(selectedRequest.id, (document.getElementById("admin-notes") as HTMLTextAreaElement)?.value || "")}
                className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Aprobar
              </button>
              <button 
                onClick={() => rejectRequest(selectedRequest.id, (document.getElementById("admin-notes") as HTMLTextAreaElement)?.value || "")}
                className="flex-1 bg-red-600 text-white p-2 rounded hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Rechazar
              </button>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
