import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "./supabase";
import { getErrorMessage } from "./error";

export const downloadClosureReport = async (closure: any, parkingLotName?: string) => {
  try {
    const openedAt = closure.opened_at;
    const closedAt = closure.closed_at;
    const parkingLotId = closure.parking_lot_id;
    const finalParkingLotName = parkingLotName || closure.parking_lots?.name || "Parqueadero";

    // 1. Fetch Parking Sessions in this period
    const { data: sessions, error: sessionsError } = await supabase
      .from("parking_sessions")
      .select("*, vehicles(plate, type)")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "completed")
      .not("exit_time", "is", null)
      .gt("exit_time", openedAt)
      .lte("exit_time", closedAt)
      .order("exit_time", { ascending: true });

    if (sessionsError) throw sessionsError;

    // 2. Fetch Withdrawals in this period
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from("cash_withdrawals")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .gt("withdrawn_at", openedAt)
      .lte("withdrawn_at", closedAt)
      .order("withdrawn_at", { ascending: true });

    if (withdrawalsError) throw withdrawalsError;

    // 3. Fetch Monthly Payments in this period
    const { data: monthlyPayments } = await supabase
      .from("monthly_subscribers")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .gt("created_at", openedAt)
      .lte("created_at", closedAt);

    const doc = new jsPDF("p", "mm", "a4");

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Reporte de Cierre de Caja", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(finalParkingLotName, 14, 28);

    doc.setFontSize(9);
    doc.text(`Periodo: ${new Date(openedAt).toLocaleString()} - ${new Date(closedAt).toLocaleString()}`, 14, 34);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 39);

    // Financial Summary
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Resumen Financiero", 14, 50);

    const monthlyTotal = monthlyPayments?.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0) || 0;
    const vehicleRevenue = closure.expected_revenue || closure.expected_amount || 0;
    const baseAmount = closure.base_amount || 0;
    const withdrawalsTotal = closure.withdrawn_amount || 0;

    const summaryData = [
      ["Recaudado (Vehículos)", new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(vehicleRevenue)],
    ];

    if (monthlyTotal > 0) {
      summaryData.push(["Recaudado (Abonados)", new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(monthlyTotal)]);
    }

    if (baseAmount > 0) {
      summaryData.push(["Base de Caja (+)", new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(baseAmount)]);
    }

    summaryData.push(["Retiros de Efectivo (-)", "-" + new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(withdrawalsTotal)]);

    const finalBalance = vehicleRevenue + monthlyTotal + baseAmount - withdrawalsTotal;
    summaryData.push(["TOTAL A ENTREGAR EN CAJA", new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(closure.total_revenue || closure.total_amount || finalBalance)]);

    autoTable(doc, {
      startY: 55,
      head: [["Concepto", "Valor"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Withdrawals Detail
    if (withdrawals && withdrawals.length > 0) {
      doc.setFontSize(12);
      doc.text("Detalle de Retiros", 14, currentY);

      const withdrawalRows = withdrawals.map(w => [
        new Date(w.withdrawn_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        w.reason,
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(w.amount)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Hora", "Motivo", "Monto"]],
        body: withdrawalRows,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] }, // red-500
        columnStyles: { 2: { halign: "right" } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Monthly Subscribers Detail
    if (monthlyPayments && monthlyPayments.length > 0) {
      doc.setFontSize(12);
      doc.text("Detalle de Abonados (Mensualidades)", 14, currentY);

      const monthlyRows = monthlyPayments.map(p => [
        p.plate,
        p.owner_name || "-",
        new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(p.amount_paid || 0)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Placa", "Nombre", "Hora", "Monto"]],
        body: monthlyRows,
        theme: "grid",
        headStyles: { fillColor: [16, 185, 129] }, // emerald-500
        columnStyles: { 3: { halign: "right" } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Parking Sessions Detail
    doc.setFontSize(12);
    doc.text("Detalle de Vehículos", 14, currentY);

    const sessionRows = (sessions || []).map(s => [
      s.receipt_number || "-",
      s.vehicles?.plate || "-",
      s.vehicles?.type || "-",
      new Date(s.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      new Date(s.exit_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(s.total_charged || 0)
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Ticket", "Placa", "Tipo", "Entrada", "Salida", "Operario", "Cobrado"]],
      body: (sessions || []).map(s => [
        s.receipt_number || "-",
        s.vehicles?.plate || "-",
        s.vehicles?.type || "-",
        new Date(s.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        new Date(s.exit_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        s.exit_employee_name || s.entry_employee_name || "-",
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(s.total_charged || 0)
      ]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] }, // slate-600
      columnStyles: { 6: { halign: "right" } }
    });

    const fileName = `cierre_${finalParkingLotName.replace(/\s+/g, '_')}_${new Date(closedAt).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

  } catch (err) {
    console.error("Error generating report", err);
    throw new Error("No se pudo generar el reporte: " + getErrorMessage(err));
  }
};
