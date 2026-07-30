"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Play, Square, Camera, CheckCircle, AlertCircle } from "lucide-react";

interface PatrolModuleProps {
  parkingLotId: string;
  employeeId: string;
}

export default function PatrolModule({ parkingLotId, employeeId }: PatrolModuleProps) {
  const [activePatrol, setActivePatrol] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ plate: "", space: "", observation: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkActivePatrol();
  }, []);

  const checkActivePatrol = async () => {
    const { data } = await supabase
      .from("security_patrols")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "in_progress")
      .maybeSingle();
    
    if (data) {
      setActivePatrol(data);
      fetchLogs(data.id);
    }
  };

  const fetchLogs = async (patrolId: string) => {
    const { data } = await supabase
      .from("patrol_logs")
      .select("*")
      .eq("patrol_id", patrolId)
      .order("verified_at", { ascending: false });
    setLogs(data || []);
  };

  const startPatrol = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_patrols")
      .insert([{ parking_lot_id: parkingLotId, employee_id: employeeId }])
      .select()
      .single();
    
    if (!error) setActivePatrol(data);
    setLoading(false);
  };

  const addLog = async () => {
    if (!newLog.plate && !newLog.space) return;
    
    const { error } = await supabase
      .from("patrol_logs")
      .insert([{
        patrol_id: activePatrol.id,
        plate: newLog.plate.toUpperCase(),
        space_number: newLog.space,
        observation: newLog.observation
      }]);
    
    if (!error) {
      setNewLog({ plate: "", space: "", observation: "" });
      fetchLogs(activePatrol.id);
    }
  };

  const endPatrol = async () => {
    setLoading(true);
    await supabase
      .from("security_patrols")
      .update({ status: "completed", end_time: new Date().toISOString() })
      .eq("id", activePatrol.id);
    
    setActivePatrol(null);
    setLogs([]);
    setLoading(false);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="text-blue-600" /> Revista de Seguridad
        </h2>
        {!activePatrol ? (
          <button 
            onClick={startPatrol}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
          >
            <Play size={18} /> Iniciar Revista
          </button>
        ) : (
          <button 
            onClick={endPatrol}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
          >
            <Square size={18} /> Finalizar Revista
          </button>
        )}
      </div>

      {activePatrol && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <input 
              placeholder="Placa (Opcional)"
              value={newLog.plate}
              onChange={(e) => setNewLog({...newLog, plate: e.target.value})}
              className="border p-2 rounded w-full"
            />
            <input 
              placeholder="N° Espacio"
              value={newLog.space}
              onChange={(e) => setNewLog({...newLog, space: e.target.value})}
              className="border p-2 rounded w-full"
            />
            <button 
              onClick={addLog}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
              Registrar Hallazgo
            </button>
            <textarea 
              placeholder="Observaciones (ej. Vidrio abajo, mal parqueado)"
              value={newLog.observation}
              onChange={(e) => setNewLog({...newLog, observation: e.target.value})}
              className="border p-2 rounded w-full md:col-span-3"
            />
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Registros de esta ronda:</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border-b pb-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold">{log.plate || "S/P"}</span> - Espacio {log.space_number}
                    <p className="text-sm text-gray-600">{log.observation}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(log.verified_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
