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
  Phone,
  ArrowRight,
  X,
  Menu,
} from "lucide-react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Parqueaderos";

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-200 selection:text-blue-900 bg-white">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-50 transition-all duration-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200/50">
              <Car size={24} />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">
              {appName}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Características
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Nosotros
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Precios
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Contacto
            </a>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-2xl shadow-md transition-all hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              Ingreso <ArrowRight size={16} />
            </Link>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-blue-600 focus:outline-none p-2"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 absolute w-full shadow-lg">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#features"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Características
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#about"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Nosotros
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#pricing"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Precios
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#contact"
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Contacto
              </a>
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  onClick={() => setIsMobileMenuOpen(false)}
                  href="/login"
                  className="w-full text-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-2xl shadow-md transition-all"
                >
                  Ingreso
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-white -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Gestión Inteligente de Parqueaderos
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-tight">
              Control total de tu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">
                negocio de parqueo
              </span>
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Administra múltiples parqueaderos, controla ingresos y salidas,
              gestiona tarifas dinámicas y obtén reportes en tiempo real. Todo
              desde una única plataforma.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium rounded-2xl shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                Comenzar Ahora
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-medium rounded-2xl shadow-md border border-slate-200 transition-all hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                Contactar Ventas
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Todo lo que necesitas para operar
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Nuestra plataforma está diseñada para simplificar la operación
                diaria y maximizar la rentabilidad de tus parqueaderos.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <MapPin size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Múltiples Sedes
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Gestiona varios parqueaderos desde una sola cuenta. Asigna
                  administradores y empleados específicos para cada ubicación.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Clock size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Tarifas Dinámicas
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Configura tarifas por fracción, hora, día o mensualidad.
                  Soporte para tarifas diferenciadas de día y de noche.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Control y Auditoría
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Historial inmutable de ingresos y salidas. Control de turnos
                  de empleados y registro de quién realizó cada cobro.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                ¿Cómo funciona?
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Un flujo de trabajo diseñado para la velocidad en la entrada y
                precisión en el cobro a la salida.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 border-t-2 border-dashed border-slate-300 z-0"></div>

              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto bg-white border-4 border-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mb-6 shadow-md">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Ingreso Rápido
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  El operario registra la placa y tipo de vehículo. El sistema
                  valida la disponibilidad y toma el tiempo de entrada exacto.
                </p>
              </div>
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto bg-white border-4 border-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mb-6 shadow-md">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Vigilancia Real
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Tanto desde el panel del operario como del administrador, se
                  puede revisar el estado de los vehículos en tiempo real.
                </p>
              </div>
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto bg-white border-4 border-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mb-6 shadow-md">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Cobro y Cierre
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Al darle salida, el sistema calcula automáticamente la tarifa
                  y genera el ticket. El administrador recauda al final del
                  turno.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Lo que dicen nuestros clientes
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Estas son algunas experiencias de negocios que ya transformaron
                su control de parking.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex text-amber-400 mb-4">{"★★★★★"}</div>
                <p className="text-slate-700 italic mb-6">
                  &quot;Antes perdíamos el control de cuánto debía cobrar cada
                  operario. Ahora la facturación es transparente y las
                  estadísticas semanales nos ayudan a proyectar gastos e
                  ingresos con total precisión.&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                    DR
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Diego Ramírez</p>
                    <p className="text-sm text-slate-500">
                      Parqueadero Central S.A.S
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex text-amber-400 mb-4">{"★★★★★"}</div>
                <p className="text-slate-700 italic mb-6">
                  &quot;El sistema en la nube nos permite tener un control a
                  distancia de nuestras 3 sucursales. El cierre automático de
                  caja fue un alivio total. La interfaz es intuitiva hasta para
                  el personal de mayor edad.&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                    SM
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Sandra Muñoz</p>
                    <p className="text-sm text-slate-500">
                      Multiparqueos Colombia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section (Mission/Vision) */}
        <section id="about" className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Nuestra Misión
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed mb-8">
                  Proporcionar a los dueños de parqueaderos una herramienta
                  tecnológica accesible, segura y fácil de usar que optimice sus
                  operaciones diarias, reduzca las pérdidas por evasión y mejore
                  la experiencia tanto de sus empleados como de sus clientes
                  finales.
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Nuestra Visión
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Convertirnos en el estándar de la industria para la gestión de
                  parqueaderos en la región, impulsando la modernización del
                  sector a través de innovación continua y un servicio al
                  cliente excepcional.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl">
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    +50
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">
                    Parqueaderos
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl mt-8">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">
                    +10k
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">
                    Vehículos/Día
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl">
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    99.9%
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">
                    Disponibilidad
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl mt-8">
                  <div className="text-4xl font-bold text-purple-400 mb-2">
                    24/7
                  </div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">
                    Soporte
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Planes y Precios
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Elige el plan que mejor se adapte al tamaño de tu operación. Sin
                contratos a largo plazo.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Basic Plan */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Básico
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Para un solo parqueadero pequeño.
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">
                    $50.000
                  </span>
                  <span className="text-slate-500 font-medium">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>1 Parqueadero</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Empleados Ilimitados</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Tarifas Básicas</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400">
                    <X size={20} className="text-slate-300 shrink-0" />
                    <span>Sin Roles Personalizados</span>
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded-2xl text-center transition-colors"
                >
                  Contactar
                </a>
              </div>

              {/* Pro Plan */}
              <div className="bg-blue-600 rounded-3xl p-8 border border-blue-500 shadow-xl shadow-blue-200 transform md:-translate-y-4 flex flex-col relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-md">
                  Más Popular
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
                <p className="text-blue-200 text-sm mb-6">
                  Para operaciones en crecimiento.
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    $120.000
                  </span>
                  <span className="text-blue-200 font-medium">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-blue-50">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>1 Parqueadero</span>
                  </li>
                  <li className="flex items-start gap-3 text-blue-50">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>Empleados Ilimitados</span>
                  </li>
                  <li className="flex items-start gap-3 text-blue-50">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>Roles Personalizados (Cajero, etc.)</span>
                  </li>
                  <li className="flex items-start gap-3 text-blue-50">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>Gestión de Abonados Mensuales</span>
                  </li>
                  <li className="flex items-start gap-3 text-blue-50">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>Soporte Prioritario</span>
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-blue-600 font-bold rounded-2xl text-center transition-colors shadow-md"
                >
                  Contactar
                </a>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Multi-Sede (Avanzado)
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Para grandes redes de parqueaderos.
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">
                    $250.000
                  </span>
                  <span className="text-slate-500 font-medium">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Hasta 5 Parqueaderos</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Administrador Multi-Sede</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Todas las funciones Premium</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>Campos Personalizados Ilimitados</span>
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded-2xl text-center transition-colors"
                >
                  Contactar
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section id="contact" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                ¿Tienes dudas? Contáctanos
              </h2>
              <p className="text-lg text-slate-600">
                Déjanos tus datos y nos comunicaremos contigo lo más pronto
                posible para resolver tus inquietudes o ayudarte con tu plan.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-md">
              <form
                action="https://formspree.io/f/xyzpjjdy"
                method="POST"
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="juan@ejemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="+57 300 000 0000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Asunto
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  >
                    <option value="">Selecciona una opción...</option>
                    <option value="Información de Precios">
                      Información de Precios
                    </option>
                    <option value="Soporte Técnico">Soporte Técnico</option>
                    <option value="Demostración del Sistema">
                      Demostración del Sistema
                    </option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="¿En qué podemos ayudarte?"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                  <Car size={20} />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  {appName}
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                La solución definitiva para la gestión de parqueaderos.
                Simplifica tu operación, controla tus ingresos y mejora tu
                servicio.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Características
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Nosotros
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Precios
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Ayuda</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>
                    Envíenos un mensaje a través del formulario de contacto para
                    cualquier solicitud.
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p>
              &copy; {new Date().getFullYear()} {appName}. Todos los derechos
              reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">
                Términos de Servicio
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Política de Privacidad
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
