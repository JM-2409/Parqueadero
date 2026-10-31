import { toLocalDateInput } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "./supabase";
import { getErrorMessage } from "./error";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "-";

/**
 * Genera el PDF de un cierre de caja.
 *
 * Los cobros del cierre son los que entraron a caja (cash_recorded_at)
 * después del cierre anterior y hasta este cierre, y que están marcados
 * para sumar a caja (include_in_cash). Es la misma regla que usa la base de
 * datos al calcular el total, por eso el detalle coincide con el resumen.
 */
export const downloadClosureReport = async (closure: any, parkingLotName?: string) => {
  try {
    const closedAt: string = closure.closed_at;
    const parkingLotId: string = closure.parking_lot_id;
    const finalParkingLotName = parkingLotName || closure.parking_lots?.name || "Parqueadero";

    // 0. Cierre anterior: define el inicio real del período.
    const { data: previousClosure } = await supabase
      .from("cash_closures")
      .select("closed_at")
      .eq("parking_lot_id", parkingLotId)
      .lt("closed_at", closedAt)
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const periodStart: string | null = previousClosure?.closed_at || null;

    // 1. Cobros de vehículos incluidos en este cierre
    let sessionsQuery = supabase
      .from("parking_sessions")
      .select("*, vehicles(plate, type)")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "completed")
      .eq("include_in_cash", true)
      .not("cash_recorded_at", "is", null)
      .lte("cash_recorded_at", closedAt);
    if (periodStart) sessionsQuery = sessionsQuery.gt("cash_recorded_at", periodStart);
    const { data: sessions, error: sessionsError } = await sessionsQuery.order("cash_recorded_at", {
      ascending: true,
    });

    if (sessionsError) throw sessionsError;

    // 2. Retiros del período
    let withdrawalsQuery = supabase
      .from("cash_withdrawals")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .lte("withdrawn_at", closedAt);
    if (periodStart) withdrawalsQuery = withdrawalsQuery.gt("withdrawn_at", periodStart);
    const { data: withdrawals, error: withdrawalsError } = await withdrawalsQuery.order("withdrawn_at", {
      ascending: true,
    });

    if (withdrawalsError) throw withdrawalsError;

    // 3. Mensualidades registradas en el período (informativo)
    const monthlyStart = periodStart || closure.opened_at;
    let monthlyQuery = supabase
      .from("monthly_subscribers")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .lte("created_at", closedAt);
    if (monthlyStart) monthlyQuery = monthlyQuery.gt("created_at", monthlyStart);
    const { data: monthlyPayments } = await monthlyQuery;

    const doc = new jsPDF("p", "mm", "a4");

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("Reporte de Cierre de Caja", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(finalParkingLotName, 14, 28);

    doc.setFontSize(9);
    const startLabel = periodStart
      ? new Date(periodStart).toLocaleString("es-CO")
      : closure.opened_at
        ? `${new Date(closure.opened_at).toLocaleString("es-CO")} (primer cierre)`
        : "Inicio de operación";
    doc.text(`Periodo: ${startLabel} - ${new Date(closedAt).toLocaleString("es-CO")}`, 14, 34);
    doc.text(`Generado el: ${new Date().toLocaleString("es-CO")}`, 14, 39);

    // Resumen financiero
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Resumen Financiero", 14, 50);

    const sessionsList = sessions || [];
    const detailTotal = sessionsList.reduce(
      (sum: number, s: any) => sum + (Number(s.total_charged ?? s.fee) || 0),
      0,
    );
    const monthlyTotal =
      monthlyPayments?.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0) || 0;
    const storedRevenue = closure.expected_revenue ?? closure.expected_amount;
    const vehicleRevenue = storedRevenue != null ? Number(storedRevenue) : detailTotal;
    const baseAmount = Number(closure.base_amount) || 0;
    const withdrawalsTotal = Number(closure.withdrawn_amount) || 0;

    const summaryData: string[][] = [
      ["Recaudado (Vehículos)", money(vehicleRevenue)],
      ["Cobros incluidos", String(sessionsList.length)],
    ];

    if (monthlyTotal > 0) {
      summaryData.push(["Mensualidades registradas (informativo)", money(monthlyTotal)]);
    }

    if (baseAmount > 0) {
      summaryData.push(["Base de Caja (+)", money(baseAmount)]);
    }

    summaryData.push(["Retiros de Efectivo (-)", "-" + money(withdrawalsTotal)]);

    const finalBalance = vehicleRevenue + baseAmount - withdrawalsTotal;
    summaryData.push([
      "TOTAL A ENTREGAR EN CAJA",
      money(closure.total_revenue ?? closure.total_amount ?? finalBalance),
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Concepto", "Valor"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Advertencia si el valor guardado no coincide con el detalle actual
    // (por ejemplo, cobros editados o eliminados después del cierre).
    if (storedRevenue != null && Math.abs(Number(storedRevenue) - detailTotal) >= 1) {
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9);
      doc.text(
        `Atención: el detalle actual suma ${money(detailTotal)} y el cierre guardó ${money(Number(storedRevenue))}.`,
        14,
        currentY,
      );
      doc.text(
        "La diferencia indica cobros modificados, eliminados o excluidos después del cierre.",
        14,
        currentY + 5,
      );
      doc.setTextColor(30, 41, 59);
      currentY += 15;
    } else {
      currentY += 5;
    }

    // Detalle de retiros
    if (withdrawals && withdrawals.length > 0) {
      doc.setFontSize(12);
      doc.text("Detalle de Retiros", 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Fecha", "Motivo", "Monto"]],
        body: withdrawals.map((w: any) => [dateTime(w.withdrawn_at), w.reason, money(w.amount)]),
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38] },
        columnStyles: { 2: { halign: "right" } },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle de mensualidades
    if (monthlyPayments && monthlyPayments.length > 0) {
      doc.setFontSize(12);
      doc.text("Detalle de Abonados (Mensualidades)", 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Placa", "Nombre", "Fecha", "Monto"]],
        body: monthlyPayments.map((p: any) => [
          p.plate,
          p.owner_name || "-",
          dateTime(p.created_at),
          money(p.amount_paid || 0),
        ]),
        theme: "grid",
        headStyles: { fillColor: [5, 150, 105] },
        columnStyles: { 3: { halign: "right" } },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle de vehículos
    doc.setFontSize(12);
    doc.text("Detalle de Vehículos", 14, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Ticket", "Placa", "Tipo", "Entrada", "Salida", "Operario", "Cobrado"]],
      body: sessionsList.map((s: any) => [
        s.receipt_number || "-",
        s.vehicles?.plate || "-",
        s.vehicles?.type || "-",
        dateTime(s.entry_time),
        dateTime(s.exit_time),
        s.exit_employee_name || s.entry_employee_name || "-",
        money(s.total_charged ?? s.fee ?? 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: { 6: { halign: "right" } },
    });

    const fileName = `cierre_${finalParkingLotName.replace(/\s+/g, "_")}_${toLocalDateInput(new Date(closedAt))}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("Error generating report", err);
    throw new Error("No se pudo generar el reporte: " + getErrorMessage(err));
  }
};
