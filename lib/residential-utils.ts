/**
 * Utilidades para la lógica residencial avanzada
 */

/**
 * Verifica si la ventana de actualización de documentos está abierta
 */
export function isDocUpdateWindowOpen(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false;
  
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return now >= start && now <= end;
}

/**
 * Calcula el tiempo restante para la ventana de actualización
 */
export function getTimeRemaining(endTime: string): string {
  const end = new Date(endTime).getTime();
  const now = new Date().getTime();
  const diff = end - now;
  
  if (diff <= 0) return "Cerrado";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m restantes`;
}

/**
 * Tipos de solicitudes residenciales
 */
export const REQUEST_TYPES = {
  VEHICLE_CHANGE: 'vehicle_change',
  SURRENDER_SPOT: 'surrender_spot',
  LOTTERY_ENTRY: 'parking_lottery_entry',
  COMMON_AREA: 'common_area',
  MOVE_REQUEST: 'move_request'
};
