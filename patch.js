const fs = require('fs');
let code = fs.readFileSync('app/employee/page.tsx', 'utf8');

const targetIndex = code.indexOf('setSelectedSession(updatedSession);');

if (targetIndex !== -1) {
    // find the end of the block
    const endOfLine = code.indexOf('\n', targetIndex);
    const before = code.substring(0, endOfLine + 1);
    const after = code.substring(endOfLine + 1);

    const insertion = `
      // Auto-send whatsapp if configured
      if (
        parkingLot?.features?.whatsapp_receipts &&
        parkingLot?.settings?.auto_send_whatsapp &&
        sessionToExit.extra_data &&
        (sessionToExit.extra_data.whatsapp || sessionToExit.extra_data.telefono || sessionToExit.extra_data.celular)
      ) {
        // Extract phone number from extra_data
        const phoneNumber = sessionToExit.extra_data.whatsapp || sessionToExit.extra_data.telefono || sessionToExit.extra_data.celular;

        try {
          const baseUrl = window.location.origin;
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;

          const params = new URLSearchParams({
            receiptNumber: receiptNumber,
            plate: sessionToExit.vehicles.plate,
            type: sessionToExit.vehicles.type,
            total: finalFee.toString(),
            entry: entryTime.toLocaleString(),
            exit: exitTime.toLocaleString(),
            duration: \`\${hours}h \${minutes}m\`,
            lotName: parkingLot.name,
          });

          const imageUrl = \`\${baseUrl}/api/receipt-image?\${params.toString()}\`;

          // Send background request to api/whatsapp
          fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber,
              mediaUrl: imageUrl,
              bodyText: \`Recibo de pago de parqueadero \${parkingLot.name}. Placa: \${sessionToExit.vehicles.plate}. Total: $\${finalFee}\`
            })
          }).catch(err => {
            // Log but don't disrupt user flow
            console.error('Failed to auto-send whatsapp receipt', err);
          });
        } catch (err) {
          console.error('Error preparing auto-whatsapp data:', err);
        }
      }
`;

    code = before + insertion + after;
    fs.writeFileSync('app/employee/page.tsx', code);
    console.log('Success');
} else {
    console.log('Not found');
}
