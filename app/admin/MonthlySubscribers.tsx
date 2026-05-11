import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Search,
  PlusCircle,
  Trash2,
  Calendar,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessMessage } from "@/components/ui/SuccessMessage";

export default function MonthlySubscribers({
  parkingLotId,
}: {
  parkingLotId: string;
}) {
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
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString()
      .split("T")[0],
  });
  const [debouncedSubPlate, setDebouncedSubPlate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSubPlate(newSub.plate), 300);
    return () => clearTimeout(timer);
  }, [newSub.plate]);

  useEffect(() => {
    const searchVehicleForSub = async () => {
      if (debouncedSubPlate.length >= 5) {
        const { data } = await supabase
          .from("vehicles")
          .select("*")
          .eq("plate", debouncedSubPlate.toUpperCase())
          .maybeSingle();

        if (data) {
          setNewSub((prev) => ({
            ...prev,
            vehicle_type: data.type || prev.vehicle_type,
            owner_name: prev.owner_name
              ? prev.owner_name
              : data.owner_name ||
                data.custom_fields_data?.["Propietario"] ||
                data.custom_fields_data?.["owner_name"] ||
                "",
          }));
        }
      }
    };
    searchVehicleForSub();
  }, [debouncedSubPlate]);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_subscribers")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .order("created_at", { ascending: false });

    if (data) {
      setSubscribers(data);
    } else if (error && error.code !== "42P01") {
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
    if (
      !newSub.plate ||
      !newSub.owner_name ||
      !newSub.start_date ||
      !newSub.end_date
    ) {
      setError("Placa, nombre y fechas son obligatorios");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase
      .from("monthly_subscribers")
      .insert([
        {
          parking_lot_id: parkingLotId,
          plate: newSub.plate.toUpperCase(),
          owner_name: newSub.owner_name,
          owner_document: newSub.owner_document || null,
          phone: newSub.phone || null,
          vehicle_type: newSub.vehicle_type,
          amount_paid: Number(newSub.amount_paid),
          start_date: newSub.start_date,
          end_date: newSub.end_date,
          is_active: true,
        },
      ]);

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
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
          .toISOString()
          .split("T")[0],
      });
      fetchSubscribers();
      setTimeout(() => setSuccess(""), 3000);
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (id: string, plate: string) => {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar al abonado de la placa ${plate}?`,
      )
    )
      return;

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

  const filteredList = subscribers.filter(
    (item) =>
      item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.owner_document &&
        item.owner_document.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Abonados Mensuales
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los clientes con mensualidad y su periodo de validez.
          </p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-3xl hidden md:block">
          <Users size={28} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-3xl text-sm font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-3xl text-sm font-bold">
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-slate-100 shadow-xl border border-slate-100 rounded-3xl bg-white p-6 sticky top-34 h-max">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-3">
            <PlusCircle size={20} className="text-indigo-500" />
            Nuevo Abonado
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Placa *
              </label>
              <input
                type="text"
                value={newSub.plate}
                onChange={(e) =>
                  setNewSub({ ...newSub, plate: e.target.value.toUpperCase() })
                }
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold uppercase transition-all"
                placeholder="ABC123"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={newSub.owner_name}
                onChange={(e) =>
                  setNewSub({ ...newSub, owner_name: e.target.value })
                }
                className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Documento (CC/NIT)
              </label>
              <input
                type="text"
                value={newSub.owner_document}
                onChange={(e) =>
                  setNewSub({ ...newSub, owner_document: e.target.value })
                }
                className="w-full px-3 py-3 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="1000000000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Documento
                </label>
                <input
                  type="text"
                  value={newSub.owner_document}
                  onChange={(e) =>
                    setNewSub({ ...newSub, owner_document: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="CC / NIT"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Celular
                </label>
                <input
                  type="text"
                  value={newSub.phone}
                  onChange={(e) =>
                    setNewSub({ ...newSub, phone: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="300..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Veh.
                </label>
                <div className="relative">
                  <select
                    value={newSub.vehicle_type}
                    onChange={(e) =>
                      setNewSub({ ...newSub, vehicle_type: e.target.value })
                    }
                    className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 appearance-none outline-none font-bold transition-all"
                  >
                    <option value="carros">Carro</option>
                    <option value="motos">Moto</option>
                    <option value="bicicletas">Bicicleta</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Valor ($)
                </label>
                <input
                  type="number"
                  value={newSub.amount_paid}
                  onChange={(e) =>
                    setNewSub({
                      ...newSub,
                      amount_paid: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={newSub.start_date}
                  onChange={(e) =>
                    setNewSub({ ...newSub, start_date: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Vencimiento
                </label>
                <input
                  type="date"
                  value={newSub.end_date}
                  onChange={(e) =>
                    setNewSub({ ...newSub, end_date: e.target.value })
                  }
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl px-3 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl px-5 py-3.5 font-bold transition-all shadow-xl border border-slate-100 shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isSubmitting ? (
                <Spinner size={18} className="text-white" />
              ) : (
                <PlusCircle size={18} />
              )}
              Registrar Abonado
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-100 rounded-3xl bg-white overflow-hidden flex flex-col shadow-xl border border-slate-100">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-3">
                Abonados Activos ({filteredList.length})
              </h3>
              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar placa o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-900 text-sm rounded-3xl pl-10 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0 sm:p-6 bg-slate-50/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner className="text-indigo-500 mb-2" />
                  <p className="text-slate-500 text-sm">Cargando...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-3xl bg-white m-4 sm:m-0">
                  <Users size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-bold">No hay abonados registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white sm:rounded-3xl border-y sm:border border-slate-100 shadow-xl border border-slate-100">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="py-4 px-5 font-bold">Placa</th>
                        <th className="py-4 px-5 font-bold">Propietario</th>
                        <th className="py-4 px-5 font-bold">Vigencia</th>
                        <th className="py-4 px-5 font-bold">Pago</th>
                        <th className="py-4 px-5 font-bold text-center">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredList.map((item) => {
                        const isExpired =
                          new Date(item.end_date) <
                          new Date(new Date().setHours(0, 0, 0, 0));
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-4 px-5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-3xl inline-block">
                                {item.plate}
                              </span>
                              <div className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                                {item.vehicle_type}
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-900">
                                {item.owner_name}
                              </div>
                              {item.phone && (
                                <div className="text-xs font-bold text-slate-500 mt-1">
                                  {item.phone}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                {isExpired ? (
                                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                )}
                                <span
                                  className={
                                    isExpired
                                      ? "text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-3xl"
                                      : "text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-3xl"
                                  }
                                >
                                  Hasta{" "}
                                  {new Date(item.end_date).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-5 font-bold text-slate-900">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                              }).format(item.amount_paid)}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={() =>
                                  handleRemove(item.id, item.plate)
                                }
                                className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center mx-auto hover:bg-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-md border border-slate-100 hover:shadow-xl border border-slate-100 active:scale-95"
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
    </div>
  );
}
