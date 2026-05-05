export function sanitizeInput(input: string): string {
  if (!input) return "";
  // Elimina etiquetas HTML básicas para prevenir inyección
  return input.replace(/[<>]/g, "").trim();
}
