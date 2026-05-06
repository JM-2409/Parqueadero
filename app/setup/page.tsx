"use client";

import Link from "next/link";
import { ArrowLeft, GitCommit, Star, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function VersionsPage() {
  const versions = [
    {
      version: "v1.2.0",
      date: "23 Marzo 2026",
      title: "Actualización Mayor: Landing Page y Mejoras UI",
      type: "feature",
      changes: [
        "Nueva página de inicio (Landing Page) con información completa del producto, planes y formulario de contacto.",
        "Rediseño de la página de versiones (Changelog).",
        "Corrección de superposición de botones en el menú lateral de todas las vistas.",
        "Corrección de desbordamiento de pantalla en los filtros de búsqueda en dispositivos móviles.",
        "Eliminación del nombre del guardia en el recibo impreso (solo visible para administradores).",
        "Implementación de recibos con numeración consecutiva automática (ej. REC-000001).",
        "Configuración de retención de historial a un máximo de 7 días."
      ]
    },
    {
      version: "v1.1.0",
      date: "22 Marzo 2026",
      title: "Control de Turnos y Campos Personalizados",
      type: "feature",
      changes: [
        "Soporte para bypass de verificación de correo en Supabase.",
        "Subida de logo en formato Base64 con visualización circular y fallback de ícono.",
        "Rediseño del panel de tarifas con soporte para 'Tarifa Única' y 'Día/Noche'.",
        "Sistema de creación de campos personalizados (obligatorios/opcionales) para la recolección de datos extra.",
        "Modal obligatorio de 'Inicio de Turno' para registrar el nombre del empleado.",
        "Integración de campos personalizados dinámicos en el formulario de ingreso.",
        "Actualización de tablas de historial para mostrar el empleado de turno y los datos extra recolectados."
      ]
    },
    {
      version: "v1.0.0",
      date: "15 Marzo 2026",
      title: "Lanzamiento Inicial",
      type: "release",
      changes: [
        "Sistema base de gestión de parqueaderos.",
        "Roles de usuario: Super Admin (Dueño), Administrador y Empleado.",
        "Gestión de múltiples sedes de parqueaderos.",
        "Registro de ingreso y salida de vehículos con cálculo automático de tarifas.",
        "Generación de recibos imprimibles.",
        "Panel de control para administradores con estadísticas básicas."
      ]
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Zap size={20} className="text-amber-500" />;
      case 'release': return <Star size={20} className="text-indigo-500" />;
      case 'security': return <ShieldCheck size={20} className="text-emerald-500" />;
      default: return <GitCommit size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 font-medium">
          <ArrowLeft size={20} />
          Volver al inicio
        </Link>
        
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Historial de Versiones</h1>
          <p className="text-lg text-slate-600">
            Mantente al día con las últimas actualizaciones, mejoras y nuevas características de la plataforma.
          </p>
        </div>

        <div className="space-y-12">
          {versions.map((v, index) => (
            <div key={index} className="relative pl-8 md:pl-0">
              <div className="md:grid md:grid-cols-4 md:gap-8 items-start">
                <div className="hidden md:block text-right pt-1">
                  <div className="text-sm font-bold text-slate-900">{v.version}</div>
                  <div className="text-sm text-slate-500">{v.date}</div>
                </div>
                
                <div className="md:col-span-3 relative">
                  {/* Timeline line */}
                  <div className="absolute left-[-31px] md:left-[-17px] top-2 bottom-[-48px] w-px bg-slate-200 last:hidden"></div>
                  
                  {/* Timeline dot */}
                  <div className="absolute left-[-39px] md:left-[-25px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 z-10"></div>
                  
                  <div className="md:hidden mb-2">
                    <span className="text-sm font-bold text-slate-900 mr-2">{v.version}</span>
                    <span className="text-sm text-slate-500">{v.date}</span>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      {getIcon(v.type)}
                      <h3 className="text-xl font-bold text-slate-900">{v.title}</h3>
                    </div>
                    
                    <ul className="space-y-3">
                      {v.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
