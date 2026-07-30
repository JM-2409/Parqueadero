/**
 * Utilidades para la gestión de pagos por QR
 */

export interface PaymentConfig {
  provider: 'nequi' | 'daviplata' | 'wompi';
  account: string;
  amount: number;
  reference: string;
}

/**
 * Genera una URL de imagen de QR usando un servicio externo
 * En producción, se recomienda usar una librería local como 'qrcode.react'
 */
export function generateQRUrl(config: PaymentConfig): string {
  let paymentData = "";

  switch (config.provider) {
    case 'nequi':
      // Ejemplo de formato para Nequi (simplificado)
      paymentData = `https://recarga.nequi.com.co/bdigital/pago?phone=${config.account}&amount=${config.amount}&ref=${config.reference}`;
      break;
    case 'daviplata':
      paymentData = `daviplata://pago?cuenta=${config.account}&monto=${config.amount}`;
      break;
    default:
      paymentData = `Pago de ${config.amount} a ${config.account} ref:${config.reference}`;
  }

  // Usamos el API de QR Server para generar la imagen
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData)}`;
}

/**
 * Simulación de verificación de pago (Polling o Webhook)
 */
export async function verifyPaymentStatus(reference: string): Promise<'paid' | 'pending' | 'failed'> {
  // Aquí iría la llamada a la API de Wompi, Nequi o tu backend
  console.log(`Verificando pago para referencia: ${reference}`);
  return 'pending'; 
}
