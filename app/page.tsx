"use client";

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
  TrendingUp,
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
        background: "var(--np-bg-primary)",
        color: "var(--np-text-primary)",
        fontFamily: "var(--font-poppins, Poppins), sans-serif",
      }}
    >
      {/* Orbes de fondo globales */}
      <div className="bg-orbs" />

      {/* Malla de puntos decorativa */}
      <div
        className="fixed inset-0 opacity-[0.012] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* ═══════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════ */}
      <header
        className="fixed top-0 w-full z-50"
        style={{
          background: "rgba(7, 11, 20, 0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Línea de gradiente superior */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(139,92,246,0.7), transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between" style={{ height: "72px" }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              }}
            >
              <Car size={22} className="text-white" />
            </div>
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ background: "linear-gradient(135deg,#818cf8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
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
                style={{ color: "#64748b" }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "#a5b4fc")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "#64748b")}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTAs escritorio */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/573014310093?text=Hola%20NexoPark%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20planes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ade80",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.2)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.1)")}
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}
            >
              Ingresar <ArrowRight size={16} />
            </Link>
          </div>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#94a3b8", background: "rgba(255,255,255,0.05)" }}
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
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(7,11,20,0.98)" }}
            >
              <div className="px-4 py-5 space-y-3 flex flex-col">
                {["Características", "Cómo Funciona", "Precios", "Contacto"].map((item, i) => (
                  <a
                    key={item}
                    href={`#${["features", "how-it-works", "pricing", "contact"][i]}`}
                    className="text-base font-semibold py-2 transition-colors"
                    style={{ color: "#94a3b8" }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
                <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-base font-bold"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
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
        <section className="relative py-24 lg:py-36 overflow-hidden">
          {/* Gradiente radial central */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc",
              }}
            >
              <Zap size={14} style={{ color: "#fbbf24" }} />
              La Nueva Generación en Gestión de Parqueaderos
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 max-w-4xl leading-[1.05]"
              style={{ color: "#f1f5f9" }}
            >
              Revoluciona el Control{" "}
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                de tu Parqueadero
              </span>
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed"
              style={{ color: "#94a3b8" }}
            >
              Una plataforma moderna, rápida y segura para administrar ingresos, salidas,
              tarifas y reportes. Todo desde la nube, accesible donde estés.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  boxShadow: "0 8px 30px rgba(99,102,241,0.45)",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
              >
                Comenzar Ahora <ArrowRight size={20} />
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)";
                  (e.currentTarget as HTMLElement).style.color = "#a5b4fc";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                }}
              >
                Hablar con Ventas
              </a>
            </motion.div>

            {/* Métricas rápidas */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-16 grid grid-cols-3 gap-6 sm:gap-12"
            >
              {[
                { value: "99.9%", label: "Disponibilidad" },
                { value: "<1s", label: "Tiempo de registro" },
                { value: "24/7", label: "Soporte activo" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-black" style={{ background: "linear-gradient(135deg,#818cf8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "#64748b" }}>{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CARACTERÍSTICAS
        ═══════════════════════════════════════════════ */}
        <section id="features" className="py-24 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.2)" }}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Funcionalidades</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "#f1f5f9" }}>
                Todo lo que necesitas, rediseñado
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
                Herramientas poderosas empaquetadas en una interfaz hermosa y fácil de usar.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: MapPin,
                  title: "Multi-Sucursal",
                  desc: "Administra todos tus parqueaderos desde una única cuenta. Vista global de tu negocio al instante.",
                  grad: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  glow: "rgba(99,102,241,0.3)",
                },
                {
                  icon: Clock,
                  title: "Tarifas Flexibles",
                  desc: "Configura cobros por fracción, hora, día o mes. Adaptabilidad total a tu modelo de negocio.",
                  grad: "linear-gradient(135deg,#f43f5e,#f97316)",
                  glow: "rgba(244,63,94,0.3)",
                },
                {
                  icon: BarChart3,
                  title: "Reportes Precisos",
                  desc: "Cierres de caja automáticos, historial inmutable y auditoría completa de cada movimiento.",
                  grad: "linear-gradient(135deg,#10b981,#06b6d4)",
                  glow: "rgba(16,185,129,0.3)",
                },
                {
                  icon: Smartphone,
                  title: "100% Responsivo",
                  desc: "Funciona perfectamente en celular, tablet y PC. Sin instalar nada, desde el navegador.",
                  grad: "linear-gradient(135deg,#f59e0b,#f97316)",
                  glow: "rgba(245,158,11,0.3)",
                },
                {
                  icon: Lock,
                  title: "Seguridad Avanzada",
                  desc: "Aprobación de dispositivos, cifrado de datos y acceso por roles. Tu negocio siempre protegido.",
                  grad: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  glow: "rgba(139,92,246,0.3)",
                },
                {
                  icon: Globe,
                  title: "Acceso en la Nube",
                  desc: "Siempre disponible, sin servidor propio. Actualizado automáticamente sin interrupciones.",
                  grad: "linear-gradient(135deg,#06b6d4,#6366f1)",
                  glow: "rgba(6,182,212,0.3)",
                },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                    className="glass-card p-7 group"
                  >
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
                      style={{
                        background: feat.grad,
                        boxShadow: `0 8px 24px ${feat.glow}`,
                        width: "52px",
                        height: "52px",
                      }}
                    >
                      <Icon size={26} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: "#f1f5f9" }}>{feat.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{feat.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CÓMO FUNCIONA
        ═══════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Pasos */}
              <div className="flex-1 space-y-8">
                <div>
                  <span className="badge-glow badge-emerald mb-4 inline-block">Flujo de trabajo</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "#f1f5f9" }}>
                    Un flujo ágil y sin complicaciones
                  </h2>
                  <p className="text-lg" style={{ color: "#64748b" }}>
                    Nuestra interfaz fue reconstruida desde cero para reducir el tiempo de atención por vehículo.
                  </p>
                </div>

                <div className="space-y-5">
                  {[
                    { n: 1, title: "Registro Rápido", desc: "Ingresa la placa y el sistema registra la hora exacta al instante." },
                    { n: 2, title: "Control Visual", desc: "Visualiza el parqueadero completo desde tu celular o computadora de forma moderna." },
                    { n: 3, title: "Cobro Automático", desc: "El sistema calcula el tiempo y aplica la tarifa correcta sin errores humanos." },
                  ].map((step) => (
                    <motion.div
                      key={step.n}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: step.n * 0.1 }}
                      className="flex gap-4"
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
                        style={{
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          color: "#fff",
                          boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                        }}
                      >
                        {step.n}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1" style={{ color: "#f1f5f9" }}>{step.title}</h4>
                        <p style={{ color: "#64748b" }}>{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Panel de muestra visual */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex-1 w-full"
              >
                <div
                  className="relative rounded-3xl p-8 overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    minHeight: "360px",
                  }}
                >
                  {/* Decoración visual de "app" */}
                  <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-4 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["#f43f5e","#fbbf24","#34d399"].map(c => (
                      <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                    <div className="flex-1 mx-4 h-5 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      { plate: "ABC-123", type: "🚗 Carro", time: "2h 15m", amount: "$5,400" },
                      { plate: "MNO-456", type: "🏍 Moto", time: "45m", amount: "$1,200" },
                      { plate: "XYZ-789", type: "🚗 Carro", time: "1h 03m", amount: "$2,600" },
                    ].map((v, i) => (
                      <motion.div
                        key={v.plate}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: "rgba(99,102,241,0.12)" }}>
                            {v.type.split(" ")[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: "#f1f5f9" }}>{v.plate}</p>
                            <p className="text-xs" style={{ color: "#64748b" }}>{v.type.split(" ")[1]} · {v.time}</p>
                          </div>
                        </div>
                        <span className="font-black text-sm" style={{ color: "#34d399" }}>{v.amount}</span>
                      </motion.div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold" style={{ color: "#64748b" }}>Total recaudado hoy</span>
                      <span className="font-black" style={{ color: "#818cf8" }}>$9,200</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PRECIOS
        ═══════════════════════════════════════════════ */}
        <section id="pricing" className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.2)" }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <span className="badge-glow badge-indigo mb-4 inline-block">Planes</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "#f1f5f9" }}>
                Planes Simples y Claros
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
                Selecciona el plan que se adapte al volumen de tu negocio.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
              {/* Plan Básico */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl p-8 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Básico</p>
                <p className="text-sm mb-6" style={{ color: "#475569" }}>Hasta 50 espacios</p>
                <div className="mb-8">
                  <span className="text-4xl font-black" style={{ color: "#f1f5f9" }}>$15,000</span>
                  <span className="text-sm ml-1" style={{ color: "#64748b" }}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["3 operarios", "Recibos por WhatsApp", "1 parqueadero"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#94a3b8" }}>
                      <CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className="block w-full py-3 text-center rounded-xl font-bold text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                >
                  Contactar
                </a>
              </motion.div>

              {/* Plan Profesional (destacado) */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative rounded-3xl p-8 flex flex-col md:-translate-y-4"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  boxShadow: "0 20px 60px rgba(99,102,241,0.25)",
                }}
              >
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
                >
                  <Star size={12} /> Popular
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a5b4fc" }}>Profesional</p>
                <p className="text-sm mb-6" style={{ color: "#818cf8" }}>Para negocios en crecimiento</p>
                <div className="mb-8">
                  <span className="text-4xl font-black" style={{ color: "#f1f5f9" }}>$25,000</span>
                  <span className="text-sm ml-1" style={{ color: "#818cf8" }}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Hasta 100 espacios","2 parqueaderos","10 operarios","Tarifas modulares V2","Abonados mensuales","Lista negra","Campos personalizados"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#c7d2fe" }}>
                      <CheckCircle2 size={16} style={{ color: "#818cf8", flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact"
                  className="block w-full py-3 text-center rounded-xl font-bold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(99,102,241,0.6)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)")}
                >
                  Contactar
                </a>
              </motion.div>

              {/* Plan Empresarial */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl p-8 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Empresarial</p>
                <p className="text-sm mb-6" style={{ color: "#475569" }}>Para grandes operadores</p>
                <div className="mb-8">
                  <span className="text-4xl font-black" style={{ color: "#f1f5f9" }}>$45,000</span>
                  <span className="text-sm ml-1" style={{ color: "#64748b" }}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["Hasta 300 espacios","5 parqueaderos","50 operarios","Parqueaderos privados","Integración con APIs","Soporte 24/7"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#94a3b8" }}>
                      <CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className="block w-full py-3 text-center rounded-xl font-bold text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                >
                  Contactar
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CONTACTO
        ═══════════════════════════════════════════════ */}
        <section id="contact" className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-3xl"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="grid md:grid-cols-5">
                {/* Panel izquierdo */}
                <div
                  className="md:col-span-2 p-10 flex flex-col justify-between"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div>
                    <h3 className="text-3xl font-extrabold mb-4" style={{ color: "#f1f5f9" }}>Hablemos</h3>
                    <p className="mb-8" style={{ color: "#94a3b8" }}>
                      Estamos listos para transformar la manera en que operas tu parqueadero.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3" style={{ color: "#94a3b8" }}>
                      <Mail size={18} style={{ color: "#818cf8" }} />
                      <span className="text-sm">Soporte 24/7</span>
                    </div>
                    <div className="flex items-center gap-3" style={{ color: "#94a3b8" }}>
                      <ShieldCheck size={18} style={{ color: "#34d399" }} />
                      <span className="text-sm">Datos Seguros</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://wa.me/573014310093?text=Hola%20NexoPark%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20planes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold transition-colors"
                        style={{ color: "#4ade80" }}
                      >
                        <MessageCircle size={18} />
                        WhatsApp: +57 301 431 0093
                      </a>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <div className="md:col-span-3 p-10" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <form
                    action="https://formspree.io/f/xyzpjjdy"
                    method="POST"
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>
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
                      <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>
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
                      <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>
                        Mensaje
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={4}
                        className="input-dark resize-none"
                        placeholder="¿Cómo podemos ayudarte?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary-glow w-full"
                    >
                      Enviar Mensaje <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer
        className="relative z-10 py-12"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  <Car size={16} className="text-white" />
                </div>
                <span className="font-extrabold" style={{ color: "#a5b4fc" }}>NexoPark</span>
              </div>
              <p className="text-sm" style={{ color: "#475569" }}>
                Sistema de gestión de parqueaderos moderno y seguro.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm" style={{ color: "#94a3b8" }}>Contacto</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#475569" }}>
                <li><a href="https://wa.me/573014310093" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">WhatsApp</a></li>
                <li><a href="mailto:soporte@nexopark.co" className="hover:text-indigo-400 transition-colors">soporte@nexopark.co</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm" style={{ color: "#94a3b8" }}>Producto</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#475569" }}>
                <li><a href="#features" className="hover:text-indigo-400 transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Precios</a></li>
                <li><a href="#contact" className="hover:text-indigo-400 transition-colors">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm" style={{ color: "#94a3b8" }}>Legal</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#475569" }}>
                <li><a href="/privacy" className="hover:text-indigo-400 transition-colors">Privacidad</a></li>
                <li><a href="/terms" className="hover:text-indigo-400 transition-colors">Términos</a></li>
                <li><a href="/license" className="hover:text-indigo-400 transition-colors">Licencia</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: "#334155" }}>© 2026 NexoPark. Todos los derechos reservados.</p>
            <p className="text-xs" style={{ color: "#334155" }}>NexoPark v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
