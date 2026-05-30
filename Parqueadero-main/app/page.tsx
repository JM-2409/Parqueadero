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
} from "lucide-react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Parqueaderos";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900 text-slate-800">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Car size={28} />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {appName}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              Características
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              Cómo Funciona
            </a>
            <a
              href="#pricing"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              Precios
            </a>
            <a
              href="#contact"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              Contacto
            </a>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-full transition-all flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
            >
              Ingresar <ArrowRight size={18} />
            </Link>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-900 p-2"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 shadow-xl absolute w-full">
            <div className="px-6 py-6 space-y-4 flex flex-col">
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#features"
                className="text-lg font-semibold text-slate-800"
              >
                Características
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#how-it-works"
                className="text-lg font-semibold text-slate-800"
              >
                Cómo Funciona
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#pricing"
                className="text-lg font-semibold text-slate-800"
              >
                Precios
              </a>
              <a
                onClick={() => setIsMobileMenuOpen(false)}
                href="#contact"
                className="text-lg font-semibold text-slate-800"
              >
                Contacto
              </a>
              <Link
                onClick={() => setIsMobileMenuOpen(false)}
                href="/login"
                className="w-full text-center mt-4 px-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl"
              >
                Ingresar al Sistema
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold mb-8">
              <Zap size={16} className="text-amber-500" />
              La Nueva Generación en Gestión
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 max-w-4xl leading-tight">
              Revoluciona el Control de tu{" "}
              <span className="text-indigo-600">Parqueadero</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
              Una plataforma moderna, rápida y segura para administrar ingresos,
              salidas, tarifas y reportes. Todo desde la nube, accesible donde
              estés.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-full shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Comenzar Ahora <ArrowRight size={20} />
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-800 border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-lg font-bold rounded-full transition-all"
              >
                Hablar con Ventas
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Todo lo que necesitas, rediseñado
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Herramientas poderosas empaquetadas en una interfaz hermosa y
                fácil de usar.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <MapPin size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Multi-Sucursal
                </h3>
                <p className="text-slate-600">
                  Administra todos tus parqueaderos desde una única cuenta.
                  Vista global de tu negocio al instante.
                </p>
              </div>
              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                  <Clock size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Tarifas Flexibles
                </h3>
                <p className="text-slate-600">
                  Configura cobros por fracción, hora, día o mes. Adaptabilidad
                  total a tu modelo de negocio.
                </p>
              </div>
              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <BarChart3 size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Reportes Precisos
                </h3>
                <p className="text-slate-600">
                  Cierres de caja automáticos, historial inmutable y auditoría
                  completa de cada movimiento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                    Un flujo ágil y sin complicaciones
                  </h2>
                  <p className="text-lg text-slate-600">
                    Nuestra interfaz fue reconstruida desde cero para reducir el
                    tiempo de atención por vehículo.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1">
                        Registro Rápido
                      </h4>
                      <p className="text-slate-600">
                        Ingresa la placa y el sistema registra la hora exacta al
                        instante.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1">
                        Control Visual
                      </h4>
                      <p className="text-slate-600">
                        Visualiza el parqueadero completo desde tu celular o
                        computadora de forma moderna.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1">
                        Cobro Automático
                      </h4>
                      <p className="text-slate-600">
                        El sistema calcula el tiempo y aplica la tarifa correcta
                        sin errores humanos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full bg-slate-100 rounded-3xl p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                <div className="text-slate-400 flex flex-col items-center">
                  <Smartphone size={80} className="mb-4 text-indigo-300" />
                  <p className="font-bold">Diseño 100% Adaptable</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold mb-4">
                Planes Simples y Claros
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Selecciona el plan que se adapte al volumen de tu negocio.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Basic */}
              <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Básico</h3>
                <p className="text-slate-400 mb-6">
                  Para pequeños emprendimientos.
                </p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold">$50k</span>
                  <span className="text-slate-400">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} /> 1
                    Parqueadero
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} />{" "}
                    Usuarios Ilimitados
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} />{" "}
                    Tarifas Estándar
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="block w-full py-4 text-center bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition"
                >
                  Contactar
                </a>
              </div>

              {/* Pro */}
              <div className="bg-indigo-600 rounded-3xl p-8 border border-indigo-500 shadow-2xl shadow-indigo-900/50 flex flex-col transform md:-translate-y-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-indigo-900 px-4 py-1 rounded-full text-sm font-bold tracking-widest uppercase">
                  Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-indigo-200 mb-6">
                  Para negocios en crecimiento.
                </p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold">$120k</span>
                  <span className="text-indigo-200">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1 text-white">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-white" size={20} /> 1
                    Parqueadero Completo
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-white" size={20} /> Roles
                    Avanzados
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-white" size={20} /> Abonados
                    Mensuales
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-white" size={20} /> Soporte
                    Prioritario
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="block w-full py-4 text-center bg-white text-indigo-900 hover:bg-slate-100 rounded-xl font-bold transition"
                >
                  Contactar
                </a>
              </div>

              {/* Enterprise */}
              <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Multi-Sede</h3>
                <p className="text-slate-400 mb-6">Redes de parqueaderos.</p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold">$250k</span>
                  <span className="text-slate-400">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} />{" "}
                    Hasta 5 Sedes
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} />{" "}
                    Control Centralizado
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400" size={20} />{" "}
                    Todas las funciones
                  </li>
                </ul>
                <a
                  href="#contact"
                  className="block w-full py-4 text-center bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition"
                >
                  Contactar
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
              <div className="grid md:grid-cols-5">
                <div className="md:col-span-2 bg-indigo-600 p-10 text-white flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-extrabold mb-4">Hablemos</h3>
                    <p className="text-indigo-100 mb-8">
                      Estamos listos para transformar la manera en que operas tu
                      parqueadero.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="text-indigo-300" />
                      <span>Soporte 24/7</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-indigo-300" />
                      <span>Datos Seguros</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3 p-10">
                  <form
                    action="https://formspree.io/f/xyzpjjdy"
                    method="POST"
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                          placeholder="Tu nombre completo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                          placeholder="tu@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Mensaje
                        </label>
                        <textarea
                          name="message"
                          required
                          rows={4}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition resize-none"
                          placeholder="¿Cómo podemos ayudarte?"
                        ></textarea>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Car className="text-indigo-600" size={24} />
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {appName}
            </span>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            &copy; {new Date().getFullYear()} {appName}. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
