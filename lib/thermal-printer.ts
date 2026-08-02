export interface ReceiptPrintData {
  receiptNumber?: string;
  parkingLotName: string;
  nit?: string;
  address?: string;
  phone?: string;
  plate: string;
  vehicleType: string;
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  fee?: number;
  totalCharged?: number;
  employeeName?: string;
  notes?: string;
}

/**
 * Genera el documento HTML optimizado para impresoras térmicas de recibos (58mm / 80mm).
 */
export function generateThermalReceiptHTML(data: ReceiptPrintData): string {
  const isExit = Boolean(data.exitTime);
  const formattedFee = (data.totalCharged ?? data.fee ?? 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${data.receiptNumber || 'Parqueadero'}</title>
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 72mm;
      margin: 0 auto;
      padding: 10px 5px;
      color: #000;
      background: #fff;
      font-size: 13px;
      line-height: 1.3;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 8px; }
    .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #333; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .plate-box {
      border: 2px solid #000;
      padding: 6px;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin: 10px 0;
      letter-spacing: 2px;
    }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .total-row { font-size: 18px; font-weight: bold; margin-top: 8px; }
    .footer { margin-top: 12px; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="header text-center">
    <div class="title">${data.parkingLotName}</div>
    ${data.nit ? `<div class="subtitle">NIT: ${data.nit}</div>` : ''}
    ${data.address ? `<div class="subtitle">${data.address}</div>` : ''}
    ${data.phone ? `<div class="subtitle">Tel: ${data.phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="text-center bold">
    ${isExit ? 'RECIBO DE SALIDA DE PAGO' : 'TICKET DE ENTRADA'}
  </div>
  ${data.receiptNumber ? `<div class="text-center subtitle">Recibo N°: ${data.receiptNumber}</div>` : ''}

  <div class="plate-box">
    ${data.plate.toUpperCase()}
  </div>

  <div class="row">
    <span>Tipo Vehículo:</span>
    <span class="bold">${data.vehicleType.toUpperCase()}</span>
  </div>

  <div class="row">
    <span>Fecha Entrada:</span>
    <span class="bold">${new Date(data.entryTime).toLocaleString("es-CO")}</span>
  </div>

  ${isExit && data.exitTime ? `
  <div class="row">
    <span>Fecha Salida:</span>
    <span class="bold">${new Date(data.exitTime).toLocaleString("es-CO")}</span>
  </div>
  ` : ''}

  ${data.durationMinutes !== undefined ? `
  <div class="row">
    <span>Tiempo Estancia:</span>
    <span class="bold">${Math.floor(data.durationMinutes / 60)}h ${data.durationMinutes % 60}m</span>
  </div>
  ` : ''}

  ${data.employeeName ? `
  <div class="row">
    <span>Atendido por:</span>
    <span>${data.employeeName}</span>
  </div>
  ` : ''}

  <div class="divider"></div>

  ${isExit ? `
  <div class="row total-row">
    <span>TOTAL PAGADO:</span>
    <span>${formattedFee}</span>
  </div>
  <div class="divider"></div>
  ` : ''}

  <div class="footer">
    <p>¡Gracias por su visita!</p>
    <p>Conserve este ticket. No nos hacemos responsables por objetos de valor no declarados.</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
  </script>
</body>
</html>
  `;
}

/**
 * Abre una ventana emergente y dispara la impresión térmica en la impresora seleccionada del sistema.
 */
export function printThermalReceipt(data: ReceiptPrintData): void {
  const htmlContent = generateThermalReceiptHTML(data);
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert("Por favor habilita las ventanas emergentes en tu navegador para imprimir recibos térmicos.");
  }
}
