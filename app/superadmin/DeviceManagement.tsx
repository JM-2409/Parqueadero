"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Trash2, MonitorSmartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";

export default function DeviceManagement() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/data?type=devices");
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      const data = result.data || [];

      // Filter out non-admin results since inner join isn't explicitly used for eq
      const adminDevices = (data || []).filter((d: any) => d.profiles?.role === "admin");
      setDevices(adminDevices);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAction = async (id: string, action: 'approve_perm' | 'approve_temp' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase.from("device_approvals").delete().eq("id", id);
        if (error) throw error;
      } else {
        const payload: any = { status: action.startsWith('approve') ? 'approved' : 'rejected' };
        if (action === 'approve_perm') {
          payload.expires_at = null;
        } else if (action === 'approve_temp') {
          const days = window.prompt("¿Por cuántos días autorizar?", "1");
          if (!days || isNaN(Number(days))) return;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + Number(days));
          payload.expires_at = expiresAt.toISOString();
        }

        const { error } = await supabase.from("device_approvals").update(payload).eq("id", id);
        if (error) throw error;
      }
      fetchDevices();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
          <MonitorSmartphone size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Equipos de Administradores</h2>
          <p className="text-slate-500">Gestiona el acceso de los equipos de tus administradores.</p>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center p-8"><Spinner size={32} className="text-indigo-600" /></div>
      ) : devices.length === 0 ? (
        <p className="text-slate-500 text-center p-8">No hay equipos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Parqueadero</th>
                <th className="py-3 px-4">Dispositivo / IP</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Vence</th>
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{d.profiles?.email}</td>
                  <td className="py-3 px-4">{d.parking_lots?.name}</td>
                  <td className="py-3 px-4 text-xs">
                    <div className="truncate max-w-[200px]" title={d.user_agent}>{d.user_agent}</div>
                    <div className="text-slate-400">{d.ip_address}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      d.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      d.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {d.status === 'pending' ? 'Pendiente' : d.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString("es-CO", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Permanente'}
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    {d.status !== 'approved' && (
                      <>
                        <button onClick={() => handleAction(d.id, 'approve_perm')} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200" title="Aprobar Permanente">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleAction(d.id, 'approve_temp')} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200" title="Aprobar Temporal">
                          <MonitorSmartphone size={16} />
                        </button>
                      </>
                    )}
                    {d.status !== 'rejected' && (
                      <button onClick={() => handleAction(d.id, 'reject')} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Rechazar">
                        <X size={16} />
                      </button>
                    )}
                    <button onClick={() => handleAction(d.id, 'delete')} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Eliminar Registro">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
