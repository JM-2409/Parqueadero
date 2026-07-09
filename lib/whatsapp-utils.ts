// Helper function to format numbers for WhatsApp
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Check if it already has the country code (assuming 57 for Colombia)
  if (!cleaned.startsWith("57")) {
    cleaned = "57" + cleaned;
  }
  return `whatsapp:+${cleaned}`;
}
