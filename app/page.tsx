"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
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
  Lock,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "NexoPark";

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: "#090d16",
        color: "#f9fafb",
        fontFamily: "var(--font-poppins, Poppins), sans-serif",
      }}
    >
      {/* ═══════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════ */}
      <header
        className="fixed top-0 w-full z-50"
        style={{
          background: "#111827",
          borderBottom: "1px solid #374151",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: "72px" }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "#4f46e5",
                boxShadow: "0 0 12px rgba(79, 70, 229, 0.4)",
              }}
            >
              <Car size={22} className="text-white" />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight text-white"
            >
              {appName}
            </span>
          </div>

          {/* Nav escritorio */}
          <nav className="hidden md:flex items-center gap-8">
            {["Características", "Cómo Funciona", "Precios", "Contacto"].map((item, i) => (
              <a
                key={item}
                href={`#${["features", "how-it-works", "pricing", "contact"][i]}`}
                className="text-sm font-semibold transition-colors"
                style={{ color: "#d1d5db" }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "#ffffff")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "#d1d5db")}
              >
                {item}
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
                background: "#064e3b",
                border: "1px solid #059669",
                color: "#6ee7b7",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#047857")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#064e3b")}
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              }}
            >
              Ingresar <ArrowRight size={16} />
            </Link>
          </div>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#f9fafb", background: "#1f2937" }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menú móvil */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ borderTop: "1px solid #374151", background: "#111827" }}
            >
              <div className="px-4 py-5 space-y-3 flex flex-col">
                {["Características", "Cómo Funciona", "Precios", "Contacto"].map((item, i) => (
                  <a
                    key={item}
                    href={`#${["features", "how-it-works", "pricing", "contact"][i]}`}
                    className="text-base font-semibold py-2 transition-colors"
                    style={{ color: "#e5e7eb" }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
                <div className="border-t pt-3" style={{ borderColor: "#374151" }}>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-base font-bold"
                    style={{ background: "#4f46e5", color: "#ffffff" }}
                  >
                    Ingresar al Sistema <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 pt-[72px] relative z-10">

        {/* ═══════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════ */}
        <section className="relative py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8"
              style={{
                background: "#1e1b4b",
                border: "1px solid #4338ca",
                color: "#c7d2fe",
              }}
            >
              <Zap size={14} style={{ color: "#fbbf24" }} />
              Sistema Integral de Control y Administración de Parqueaderos
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 max-w-4xl leading-tight text-white"
            >
              Administra tu Parqueadero{" "}
              <span className="text-indigo-400">
                de Forma Ágil y Segura
              </span>
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed"
              style={{ color: "#d1d5db" }}
            >
              Control vehicular, tickets digitales, tarifas por minuto u hora, mensualidades, cierres de caja y reportes en tiempo real desde cualquier dispositivo.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all"
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  boxShadow: "0 4px 20px rgba(79, 70, 229, 0.4)",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#4338ca")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#4f46e5")}
              >
                Comenzar Ahora <ArrowRight size={20} />
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all"
                style={{
                  background: "#1f2937",
                  border: "1px solid #4b5563",
                  color: "#f9fafb",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "#374151";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "#1f2937";
                }}
              >
                Hablar con Ventas
              </a>
            </motion.div>

            {/* Métricas rápidas */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 grid grid-cols-3 gap-6 sm:gap-12"
            >
              {[
                { value: "99.9%", label: "Disponibilidad" },
                { value: "<1s", label: "Tiempo de registro" },
                { value: "24/7", label: "Control en la nube" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-black text-indigo-400">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "#9ca3af" }}>{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CARACTERÍSTICAS
        ═══════════════════════════════════════════════ */}
        <section id="features" className="py-20" style={{ background: "#111827" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Funcionalidades Específicas</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">
                Todo lo que tu parqueadero necesita
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#9ca3af" }}>
                Diseñado para maximizar la velocidad de ingreso, el control de caja y la seguridad vehicular.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: MapPin,
                  title: "Multi-Sucursal",
                  desc: "Administra múltiples sedes o sedes de parqueaderos desde una sola cuenta central.",
                },
                {
                  icon: Clock,
                  title: "Tarifas Personalizables",
                  desc: "Configura cobros por minuto, fracción, hora, día o mensualidad según el tipo de vehículo.",
                },
                {
                  icon: BarChart3,
                  title: "Cierres de Caja Precisos",
                  desc: "Arqueos de caja automáticos, reporte de ingresos en vivo y trazabilidad inalterable de dinero.",
                },
                {
                  icon: Smartphone,
                  title: "Compatibilidad Total",
                  desc: "Funciona en teléfonos móviles, computadoras e impresoras térmicas sin instalaciones complejas.",
                },
                {
                  icon: Lock,
                  title: "Seguridad y Roles",
                  desc: "Perfiles independientes para administradores y operarios con registros detallados de actividad.",
                },
                {
                  icon: Globe,
                  title: "Información en la Nube",
                  desc: "Tus registros están respaldados constantemente y son accesibles en todo momento.",
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-6 rounded-2xl"
                    style={{ background: "#1f2937", border: "1px solid #374151" }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: "#312e81", color: "#a5b4fc" }}
                    >
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white">{feat.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CÓMO FUNCIONA
        ═══════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Pasos */}
              <div className="flex-1 space-y-8">
                <div>
                  <span className="badge-glow badge-emerald mb-4 inline-block">Flujo Operativo</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">
                    Procesos ultrarrápidos para evitar filas
                  </h2>
                  <p className="text-lg" style={{ color: "#9ca3af" }}>
                    Una interfaz limpia pensada para operarios en punto de pago e ingreso.
                  </p>
                </div>

                <div className="space-y-5">
                  {[
                    { n: 1, title: "Registro de Placa", desc: "Ingreso en menos de 3 segundos registrando placa, tipo de vehículo y casilla asignada." },
                    { n: 2, title: "Emisión de Ticket", desc: "Comprobante impreso o enviado directamente por WhatsApp al cliente." },
                    { n: 3, title: "Liquidación Automática", desc: "El sistema calcula el valor exacto según el tiempo de permanencia y la tarifa activa." },
                  ].map((step) => (
                    <div key={step.n} className="flex gap-4">
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white"
                        style={{ background: "#4f46e5" }}
                      >
                        {step.n}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1 text-white">{step.title}</h4>
                        <p style={{ color: "#d1d5db" }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel de muestra visual */}
              <div className="flex-1 w-full">
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: "#111827",
                    border: "1px solid #374151",
                  }}
                >
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-800">
                    <span className="font-bold text-sm text-gray-300">Monitoreo de Vehículos Activos</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
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
                        className="flex items-center justify-between p-3.5 rounded-xl"
                        style={{ background: "#1f2937", border: "1px solid #374151" }}
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{v.plate}</p>
                          <p className="text-xs" style={{ color: "#9ca3af" }}>{v.type} · Tiempo: {v.time}</p>
                        </div>
                        <span className="font-extrabold text-sm text-emerald-400">{v.amount}</span>
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
        <section id="pricing" className="py-20" style={{ background: "#111827" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Planes Flexibles</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">
                Precios transparentes para cada necesidad
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#9ca3af" }}>
                Selecciona la alternativa ideal según el flujo de tu parqueadero.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Plan Básico */}
              <div
                className="rounded-2xl p-8 flex flex-col"
                style={{ background: "#1f2937", border: "1px solid #374151" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>Básico</p>
                <p className="text-sm mb-6" style={{ color: "#d1d5db" }}>Hasta 50 celdas de parqueo</p>
                <div className="mb-8">
                  <span className="text-4xl font-black text-white">$15.000</span>
                  <span className="text-sm ml-1" style={{ color: "#9ca3af" }}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["3 operarios", "Recibos digitales", "1 ubicación"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#e5e7eb" }}>
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className="block w-full py-3 text-center rounded-xl font-bold text-sm text-white"
                  style={{ background: "#374151", border: "1px solid #4b5563" }}
                >
                  Solicitar Plan
                </a>
              </div>

              {/* Plan Profesional */}
              <div
                className="rounded-2xl p-8 flex flex-col relative"
                style={{
                  background: "#1e1b4b",
                  border: "2px solid #6366f1",
                }}
              >
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white"
                >
                  <Star size={12} /> Más Recomendado
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2 text-indigo-300">Profesional</p>
                <p className="text-sm mb-6 text-indigo-200">Parqueaderos de mediano tráfico</p>
                <div className="mb-8">
                  <span className="text-4xl font-black text-white">$25.000</span>
                  <span className="text-sm ml-1 text-indigo-200">/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Hasta 150 celdas", "2 parqueaderos", "10 operarios", "Tarifas avanzadas", "Abonados mensuales", "Lista de control"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-indigo-100">
                      <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact"
                  className="block w-full py-3 text-center rounded-xl font-bold text-sm text-white"
                  style={{ background: "#4f46e5" }}
                >
                  Solicitar Plan
                </a>
              </div>

              {/* Plan Empresarial */}
              <div
                className="rounded-2xl p-8 flex flex-col"
                style={{ background: "#1f2937", border: "1px solid #374151" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>Empresarial</p>
                <p className="text-sm mb-6" style={{ color: "#d1d5db" }}>Grandes operadores y redes</p>
                <div className="mb-8">
                  <span className="text-4xl font-black text-white">$45.000</span>
                  <span className="text-sm ml-1" style={{ color: "#9ca3af" }}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Capacidad ilimitada", "Red de parqueaderos", "Operarios ilimitados", "Integraciones personalizadas", "Soporte dedicado 24/7"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#e5e7eb" }}>
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className="block w-full py-3 text-center rounded-xl font-bold text-sm text-white"
                  style={{ background: "#374151", border: "1px solid #4b5563" }}
                >
                  Solicitar Plan
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CONTACTO
        ═══════════════════════════════════════════════ */}
        <section id="contact" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid #374151", background: "#111827" }}
            >
              <div className="grid md:grid-cols-5">
                <div
                  className="md:col-span-2 p-8 flex flex-col justify-between"
                  style={{
                    background: "#1f2937",
                    borderRight: "1px solid #374151",
                  }}
                >
                  <div>
                    <h3 className="text-2xl font-extrabold mb-3 text-white">Contacto Directo</h3>
                    <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
                      Escríbenos para una demostración o asesoría en la implementación para tu parqueadero.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm" style={{ color: "#d1d5db" }}>
                      <Mail size={18} className="text-indigo-400" />
                      <span>Atención Inmediata</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm" style={{ color: "#d1d5db" }}>
                      <ShieldCheck size={18} className="text-emerald-400" />
                      <span>Plataforma Garantizada</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://wa.me/573014310093?text=Hola%20NexoPark%2C%20quisiera%20mas%20informacion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        <MessageCircle size={18} />
                        WhatsApp: +57 301 431 0093
                      </a>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <div className="md:col-span-3 p-8">
                  <form
                    action="https://formspree.io/f/xyzpjjdy"
                    method="POST"
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                        Nombre
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="input-dark"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="input-dark"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                        Mensaje
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={4}
                        className="input-dark resize-none"
                        placeholder="¿Cuántos espacios o sedes manejas?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary-glow w-full mt-2"
                    >
                      Enviar Mensaje <ArrowRight size={18} />
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
        className="py-10"
        style={{ background: "#111827", borderTop: "1px solid #374151" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm" style={{ color: "#9ca3af" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-600 text-white">
                <Car size={16} />
              </div>
              <span className="font-bold text-white">NexoPark</span>
              <span>— Sistema de Administración de Parqueaderos</span>
            </div>
            <p className="text-xs">© 2026 NexoPark. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
