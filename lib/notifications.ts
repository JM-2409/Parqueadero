/**
 * Utilidades para notificaciones de Gestión Residencial
 */

import { supabase } from "./supabase";

export interface PackageNotification {
  residentName: string;
  residentPhone: string;
  description: string;
  block: string;
  apartment: string;
}

/**
 * Simulación de envío de notificación por WhatsApp (Twilio)
 */
export async function sendPackageNotification(data: PackageNotification) {
  console.log(`Enviando WhatsApp a ${data.residentPhone}...`);
  const message = `Hola ${data.residentName}, tienes un paquete en portería: ${data.description}. Bloque ${data.block}, Apto ${data.apartment}.`;
  
  // Aquí se llamaría a tu API de Twilio configurada
  // const response = await fetch('/api/whatsapp/send', { ... });
  
  return { success: true, message: "Notificación enviada" };
}

/**
 * Flujo de aprobación de solicitud
 */
export async function approveResidentRequest(requestId: string, adminId: string) {
  const { data, error } = await supabase
    .from('resident_requests')
    .update({ 
      status: 'approved',
      admin_notes: 'Solicitud aprobada tras validación de documentos.' 
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  // Si es cambio de vehículo, actualizar la tabla de vehículos
  if (data.type === 'vehicle') {
    // Lógica para actualizar placa en tabla vehicles
  }

  return data;
}
