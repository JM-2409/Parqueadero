import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, PlusCircle, Trash2, Calendar, CreditCard, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function MonthlySubscribers({ parkingLotId }: { parkingLotId: string }) {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [newSub, setNewSub] = useState({
    plate: "",
    owner_name: "",
    owner_document: "",
    phone: "",
    vehicle_type: "carros",
    amount_paid: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_subscribers")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });

    if (data) {
      setSubscribers(data);
    } else if (error && error.code !== '42P01') {
      console.error(error);
    }
    setLoading(false);
  }, [parkingLotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.plate || !newSub.owner_name || !newSub.start_date || !newSub.end_date) {
      setError("Placa, nombre y fechas son obligatorios");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase
      .from("monthly_subscribers")
      .insert([{
        parking_lot_id: parkingLotId,
        plate: newSub.plate.toUpperCase(),
        owner_name: newSub.owner_name,
        owner_document: newSub.owner_document || null,
        phone: newSub.phone || null,
        vehicle_type: newSub.vehicle_type,
        amount_paid: Number(newSub.amount_paid),
        start_date: newSub.start_date,
        end_date: newSub.end_date,
        is_active: true
      }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Abonado registrado exitosamente");
      setNewSub({
        plate: "",
        owner_name: "",
        owner_document: "",
        phone: "",
        vehicle_type: "carros",
        amount_paid: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      });
      fetchSubscribers();
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (id: string, plate: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al abonado de la placa ${plate}?`)) return;

    const { error } = await supabase
      .from("monthly_subscribers")
      .delete()
      .eq("id", id);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`Abonado ${plate} eliminado`);
      fetchSubscribers();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const filteredList = subscribers.filter(item => 
    item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.owner_document && item.owner_document.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}
      {success && <SuccessMessage message={success} />}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-white p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle size={18} className="text-indigo-500" />
            Nuevo Abonado
          </h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Placa *</label>
              <input 
                type="text" 
                value={newSub.plate} 
                onChange={(e) => setNewSub({...newSub, plate: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase"
                placeholder="ABC123"
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Completo *</label>
              <input 
                type="text" 
                value={newSub.owner_name} 
                onChange={(e) => setNewSub({...newSub, owner_name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Documento (CC/NIT)</label>
              <input 
                type="text" 
                value={newSub.owner_document} 
                onChange={(e) => setNewSub({...newSub, owner_document: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="1000000000"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Documento</label>
                <input 
                  type="text" 
                  value={newSub.owner_document} 
                  onChange={(e) => setNewSub({...newSub, owner_document: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="CC / NIT"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Celular</label>
                <input 
                  type="text" 
                  value={newSub.phone} 
                  onChange={(e) => setNewSub({...newSub, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="300..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Vehículo</label>
                <div className="relative">
                  <select
                    value={newSub.vehicle_type}
                    onChange={(e) => setNewSub({...newSub, vehicle_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm bg-white"
                  >
                    <option value="carros">Carro</option>
                    <option value="motos">Moto</option>
                    <option value="bicicletas">Bicicleta</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Valor Pagado ($)</label>
                <input 
                  type="number" 
                  value={newSub.amount_paid} 
                  onChange={(e) => setNewSub({...newSub, amount_paid: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Inicio</label>
                <input 
                  type="date" 
                  value={newSub.start_date} 
                  onChange={(e) => setNewSub({...newSub, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vencimiento</label>
                <input 
                  type="date" 
                  value={newSub.end_date} 
                  onChange={(e) => setNewSub({...newSub, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-indigo-400"
              >
                {isSubmitting ? <Spinner size={18} className="text-white" /> : <PlusCircle size={18} />}
                Registrar Abonado
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 border border-slate-200 rounded-xl bg-slate-50 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center rounded-t-xl">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Abonados Activos ({filteredList.length})
            </h3>
            <div className="relative w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar placa o nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm bg-slate-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><Spinner className="text-indigo-600" /></div>
            ) : filteredList.length === 0 ? (
              <div className="text-center p-8 text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
                No hay abonados registrados.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-3 px-4 font-semibold">Placa</th>
                      <th className="py-3 px-4 font-semibold">Propietario</th>
                      <th className="py-3 px-4 font-semibold">Vigencia</th>
                      <th className="py-3 px-4 font-semibold">Pago</th>
                      <th className="py-3 px-4 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.map((item) => {
                      const isExpired = new Date(item.end_date) < new Date(new Date().setHours(0,0,0,0));
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded inline-block">{item.plate}</span>
                            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{item.vehicle_type}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{item.owner_name}</div>
                            {item.phone && <div className="text-xs text-slate-500 mt-0.5">{item.phone}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {isExpired ? (
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              )}
                              <span className={isExpired ? "text-red-600 font-medium" : "text-slate-600"}>
                                Hasta {new Date(item.end_date).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(item.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => handleRemove(item.id, item.plate)}
                              className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar abonado"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
