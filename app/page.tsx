"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  Mail,
  ArrowRight,
  X,
  Menu,
  Zap,
  BarChart3,
  Smartphone,
  MessageCircle,
  Star,
  Globe,
  Wallet,
  Users,
  Shield,
  Camera,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  formatSubscriptionPrice,
  type SubscriptionPlan,
} from "@/lib/subscriptions";

const navigationItems = [
  { label: "Características", href: "#features" },
  { label: "Novedades", href: "#updates" },
  { label: "Cómo Funciona", href: "#how-it-works" },
  { label: "Precios", href: "#pricing" },
  { label: "Contacto", href: "#contact" },
];

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "NexoPark";

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select(
            "id, name, price, description, currency, billing_interval, max_branches, allow_custom_roles, allow_monthly_subscribers, is_active",
          )
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (!active) return;
        if (error) throw error;
        setPlans((data || []) as SubscriptionPlan[]);
      } catch (error: unknown) {
        console.error("Error al cargar los planes públicos:", error);
        setPlansError(
          "No fue posible cargar los precios. Contáctanos para recibir información.",
        );
      } finally {
        if (active) setPlansLoading(false);
      }
    };

    void loadPlans();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "var(--font-poppins, Poppins), sans-serif",
      }}
    >
      {/* ═══════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════ */}
      <header
        className="fixed top-0 w-full z-50"
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: "72px" }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-700 text-white shadow-sm"
            >
              <Car size={22} />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight text-slate-900"
            >
              {appName}
            </span>
          </div>

          {/* Nav escritorio */}
          <nav className="hidden md:flex items-center gap-8">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold transition-colors"
                style={{ color: "#334155" }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "#4338ca")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "#334155")}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTAs escritorio */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/573014310093?text=Hola%20NexoPark%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20planes%20para%20parqueaderos"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "#d1fae5",
                border: "1px solid #a7f3d0",
                color: "#065f46",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#a7f3d0")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#d1fae5")}
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-white bg-indigo-700 hover:bg-indigo-800 shadow-sm"
            >
              Ingresar <ArrowRight size={16} />
            </Link>
          </div>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors text-slate-800 bg-slate-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menú móvil */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid #e2e8f0", background: "#ffffff" }}
          >
            <div className="px-4 py-5 space-y-3 flex flex-col">
              {navigationItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-base font-semibold py-2 text-slate-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t pt-3" style={{ borderColor: "#e2e8f0" }}>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-base font-bold bg-indigo-700 text-white"
                >
                  Ingresar al Sistema <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-[72px] relative z-10">

        {/* ═══════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8 bg-indigo-50 border border-indigo-200 text-indigo-900"
            >
              <Zap size={14} className="text-amber-600" />
              Sistema Integral de Control y Administración de Parqueaderos
            </div>

            {/* Título */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 max-w-4xl leading-tight text-slate-900"
            >
              Administra tu Parqueadero{" "}
              <span className="text-indigo-700">
                de Forma Ágil y Segura
              </span>
            </h1>

            {/* Subtítulo */}
            <p
              className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed text-slate-700 font-medium"
            >
              Controla ingresos, tarifas, caja, equipo y sedes desde una sola plataforma. Consulta la operación en tiempo real y trabaja desde el computador, el celular o la aplicación web instalable.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-white bg-indigo-700 hover:bg-indigo-800 transition-all shadow-md"
              >
                Comenzar Ahora <ArrowRight size={20} />
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all"
              >
                Hablar con Ventas
              </a>
            </div>

            {/* Resumen de capacidades */}
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {[
                { value: "En un solo lugar", label: "Vehículos, caja y reportes" },
                { value: "En tiempo real", label: "Cambios en espacios privados" },
                { value: "A tu medida", label: "Planes y funciones por sede" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white bg-white/80 px-5 py-4 shadow-sm text-center">
                  <p className="text-xl sm:text-2xl font-black text-indigo-700">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 font-semibold text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CARACTERÍSTICAS
        ═══════════════════════════════════════════════ */}
        <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Funcionalidades Específicas</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-slate-900">
                Todo lo que tu parqueadero necesita
              </h2>
              <p className="text-lg max-w-2xl mx-auto text-slate-600">
                Diseñado para maximizar la velocidad de ingreso, el control de caja y la seguridad vehicular.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Car,
                  title: "Control de vehículos",
                  desc: "Registra entradas y salidas, calcula el valor de permanencia y consulta los vehículos activos.",
                },
                {
                  icon: Clock,
                  title: "Tarifas configurables",
                  desc: "Define tarifas por tipo de vehículo, tiempo de permanencia, horarios y condiciones especiales.",
                },
                {
                  icon: Wallet,
                  title: "Caja y gastos",
                  desc: "Consulta el recaudo, transfiere dinero al fondo para gastos y controla los cierres desde una sola sección.",
                },
                {
                  icon: FileCheck2,
                  title: "Fondo para gastos",
                  desc: "El saldo transferido desde Caja queda disponible para asignaciones, legalizaciones, facturas y devoluciones con historial detallado.",
                },
                {
                  icon: MapPin,
                  title: "Sedes y espacios privados",
                  desc: "Administra varias sedes y consulta los cambios de los espacios privados en tiempo real.",
                },
                {
                  icon: Users,
                  title: "Abonados y equipo",
                  desc: "Gestiona mensualidades, operarios, turnos y roles de acuerdo con las funciones de cada usuario.",
                },
                {
                  icon: Star,
                  title: "Planes y suscripciones",
                  desc: "Consulta las opciones activas y administra la vigencia de cada parqueadero desde la plataforma.",
                },
                {
                  icon: Shield,
                  title: "Acceso por perfiles",
                  desc: "Controla permisos y, si está habilitado, solicita aprobación antes de usar un dispositivo nuevo.",
                },
                {
                  icon: Camera,
                  title: "Inspecciones con evidencia",
                  desc: "Registra revisiones de vehículos y consulta el historial con soporte fotográfico.",
                },
                {
                  icon: BarChart3,
                  title: "Reportes e indicadores",
                  desc: "Revisa ocupación, ingresos, actividad e historial para dar seguimiento a la operación.",
                },
                {
                  icon: Smartphone,
                  title: "Instalable en tus dispositivos",
                  desc: "Usa NexoPark desde el navegador o instálalo como aplicación web progresiva en móviles y computadores.",
                },
                {
                  icon: MessageCircle,
                  title: "Recibos por WhatsApp",
                  desc: "Comparte comprobantes con los clientes por WhatsApp cuando esta función esté habilitada.",
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-indigo-100 text-indigo-800"
                    >
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            NOVEDADES
        ═══════════════════════════════════════════════ */}
        <section id="updates" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="badge-glow badge-emerald mb-4 inline-block">Versión 2.4.0</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-slate-900">
                Caja más sencilla, con saldos claros
              </h2>
              <p className="text-lg max-w-2xl mx-auto text-slate-600">
                Recaudo y fondo para gastos conectados en una sola sección, con cada movimiento registrado de forma segura.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: Wallet,
                  title: "Una sola sección de Caja",
                  desc: "Consulta el recaudo, realiza transferencias al fondo para gastos y revisa cierres desde un solo lugar.",
                },
                {
                  icon: ShieldCheck,
                  title: "Transferencia sincronizada",
                  desc: "El monto se descuenta del recaudo y se suma al fondo para gastos en una sola operación, sin duplicar movimientos.",
                },
                {
                  icon: FileCheck2,
                  title: "Historial consistente",
                  desc: "Las transferencias y sus reversos quedan vinculados en los registros de Caja y del fondo para gastos.",
                },
              ].map((update) => {
                const Icon = update.icon;
                return (
                  <article
                    key={update.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
                      <Icon size={24} />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">{update.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{update.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CÓMO FUNCIONA
        ═══════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Pasos */}
              <div className="flex-1 space-y-8">
                <div>
                  <span className="badge-glow badge-emerald mb-4 inline-block">Flujo Operativo</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-slate-900">
                    De la entrada al cierre, con cada dato en su lugar
                  </h2>
                  <p className="text-lg text-slate-600">
                    Un flujo sencillo para registrar la operación y mantener informado al equipo.
                  </p>
                </div>

                <div className="space-y-5">
                  {[
                    { n: 1, title: "Registra la entrada", desc: "Anota la placa, el tipo de vehículo y los datos requeridos por el parqueadero." },
                    { n: 2, title: "Entrega el comprobante", desc: "Imprime el recibo o compártelo por WhatsApp si la función está habilitada." },
                    { n: 3, title: "Liquida la salida", desc: "Consulta el valor calculado con base en el tiempo y la tarifa configurada." },
                    { n: 4, title: "Revisa la operación", desc: "Administra cierres, movimientos, ocupación e historial desde el panel." },
                  ].map((step) => (
                    <div key={step.n} className="flex gap-4">
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white bg-indigo-700"
                      >
                        {step.n}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1 text-slate-900">{step.title}</h4>
                        <p className="text-slate-600">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel de muestra visual */}
              <div className="flex-1 w-full">
                <div
                  className="rounded-2xl p-6 bg-slate-50 border border-slate-300 shadow-sm"
                >
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                    <span className="font-bold text-sm text-slate-800">Vista de ejemplo · Vehículos activos</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      En Operación
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { plate: "ABC-123", type: "🚗 Carro", time: "2h 15m", amount: "$5.400" },
                      { plate: "MNO-456", type: "🏍 Moto", time: "45m", amount: "$1.200" },
                      { plate: "XYZ-789", type: "🚗 Carro", time: "1h 03m", amount: "$2.600" },
                    ].map((v) => (
                      <div
                        key={v.plate}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-900">{v.plate}</p>
                          <p className="text-xs text-slate-500">{v.type} · Tiempo: {v.time}</p>
                        </div>
                        <span className="font-extrabold text-sm text-emerald-700">{v.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PRECIOS
        ═══════════════════════════════════════════════ */}
        <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Planes Flexibles</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-slate-900">
                Precios transparentes para cada necesidad
              </h2>
              <p className="text-lg max-w-2xl mx-auto text-slate-600">
                Selecciona la alternativa ideal según el flujo de tu parqueadero.
              </p>
            </div>

            {plansLoading ? (
              <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
                Cargando planes vigentes...
              </div>
            ) : plansError ? (
              <div
                role="alert"
                className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center font-semibold text-amber-900"
              >
                {plansError}
              </div>
            ) : plans.length === 0 ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                En este momento no hay planes disponibles. Contáctanos para
                conocer las opciones.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isRecommended = plan.name
                    .toLocaleLowerCase()
                    .includes("premium");
                  const features = [
                    plan.max_branches > 1
                      ? `Hasta ${plan.max_branches} sedes`
                      : "1 sede",
                    ...(plan.allow_custom_roles
                      ? ["Roles personalizados"]
                      : []),
                    ...(plan.allow_monthly_subscribers
                      ? ["Abonados mensuales"]
                      : []),
                    "Gestión de operación y caja",
                  ];
                  const intervalLabels = {
                    monthly: "mes",
                    quarterly: "trimestre",
                    yearly: "año",
                  };

                  return (
                    <article
                      key={plan.id}
                      className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ${
                        isRecommended
                          ? "border-2 border-indigo-600 shadow-md"
                          : "border border-slate-200"
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-700 px-3 py-1 text-xs font-bold text-white">
                          <Star size={12} /> Plan destacado
                        </div>
                      )}
                      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-700">
                        {plan.name}
                      </p>
                      <p className="mb-6 min-h-10 text-sm text-slate-700">
                        {plan.description ||
                          (plan.max_branches > 1
                            ? `Para operaciones de hasta ${plan.max_branches} sedes.`
                            : "Para la operación de una sede de parqueadero.")}
                      </p>
                      <div className="mb-8">
                        <span className="text-4xl font-black text-slate-900">
                          {formatSubscriptionPrice(
                            Number(plan.price),
                            plan.currency,
                          )}
                        </span>
                        <span className="ml-1 text-sm font-semibold text-slate-500">
                          /{intervalLabels[plan.billing_interval]}
                        </span>
                      </div>
                      <ul className="mb-8 flex-1 space-y-3">
                        {features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-3 text-sm text-slate-700"
                          >
                            <CheckCircle2
                              size={16}
                              className="flex-shrink-0 text-emerald-600"
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <a
                        href={`https://wa.me/573014310093?text=${encodeURIComponent(
                          `Hola NexoPark, quiero información sobre el plan ${plan.name}.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block w-full rounded-xl py-3 text-center text-sm font-bold ${
                          isRecommended
                            ? "bg-indigo-700 text-white hover:bg-indigo-800"
                            : "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        Solicitar este plan
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CONTACTO
        ═══════════════════════════════════════════════ */}
        <section id="contact" className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-2xl overflow-hidden bg-white border border-slate-300 shadow-sm"
            >
              <div className="grid md:grid-cols-5">
                <div
                  className="md:col-span-2 p-8 flex flex-col justify-between bg-gradient-to-br from-indigo-950 to-slate-900 text-white"
                >
                  <div>
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100">
                      <MessageCircle size={14} /> Hablemos de tu operación
                    </span>
                    <h3 className="text-2xl font-extrabold mb-3 text-white">Encuentra el plan ideal</h3>
                    <p className="text-sm mb-6 leading-relaxed text-indigo-100">
                      Cuéntanos cómo funciona tu parqueadero y te ayudamos con una demostración o asesoría de implementación.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-indigo-100">
                      <Mail size={18} className="text-cyan-300" />
                      <span>Asesoría según tus necesidades</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-indigo-100">
                      <ShieldCheck size={18} className="text-emerald-300" />
                      <span>Información sobre funciones y planes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://wa.me/573014310093?text=Hola%20NexoPark%2C%20quisiera%20mas%20informacion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        <MessageCircle size={18} />
                        WhatsApp: +57 301 431 0093
                      </a>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <div className="md:col-span-3 p-8 sm:p-10">
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Solicita información</p>
                    <p className="mt-1 text-sm text-slate-600">Completa tus datos y cuéntanos qué necesitas.</p>
                  </div>
                  <form
                    action="https://formspree.io/f/xyzpjjdy"
                    method="POST"
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700">
                        Nombre
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        required
                        maxLength={100}
                        autoComplete="name"
                        className="input-dark"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700">
                        Correo electrónico
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        className="input-dark"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700">
                        Mensaje
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={4}
                        maxLength={1000}
                        className="input-dark resize-none"
                        placeholder="¿Cuántas sedes manejas y qué te gustaría mejorar?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary-glow w-full mt-2"
                    >
                      Enviar mensaje <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer
        className="py-10 bg-slate-100 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-700 text-white">
                <Car size={16} />
              </div>
              <span className="font-bold text-slate-900">
                NexoPark v{process.env.NEXT_PUBLIC_APP_VERSION || "2.4.0"}
              </span>
              <span>— Gestión administrativa y operación de parqueaderos</span>
            </div>
            <p className="text-xs text-slate-500">© 2026 NexoPark. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
