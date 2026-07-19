import { expect, test, describe } from "vitest";
import { calculateFee, TariffRule, PricingSettings } from "./pricing";

describe("calculateFee", () => {
  const entryTime = new Date("2024-05-20T10:00:00Z"); // Lunes, 10 AM UTC
  const exitTime = new Date("2024-05-20T11:00:00Z"); // Lunes, 11 AM UTC

  test("should return 0 when rules is an empty array", () => {
    const rules: TariffRule[] = [];
    const result = calculateFee(entryTime, exitTime, rules);
    expect(result).toBe(0);
  });

  test("should return 0 when rules is null", () => {
    // Intentionally passing null to test error handling
    const result = calculateFee(entryTime, exitTime, null as unknown as TariffRule[]);
    expect(result).toBe(0);
  });

  test("should return 0 when rules is undefined", () => {
    // Intentionally passing undefined to test error handling
    const result = calculateFee(entryTime, exitTime, undefined as unknown as TariffRule[]);
    expect(result).toBe(0);
  });

  test("should return 0 when exitTime is before entryTime", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    const earlierExitTime = new Date(entryTime.getTime() - 1000);
    const result = calculateFee(entryTime, earlierExitTime, rules);
    expect(result).toBe(0);
  });

  test("happy path: should calculate fee correctly for hourly rate", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    const result = calculateFee(entryTime, exitTime, rules);
    expect(result).toBe(1000);
  });

  // Pruebas para tarifas por minuto
  test("should calculate fee for minute rate", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "minuto", amount: 50 }
    ];
    const exitMins = new Date("2024-05-20T10:30:00Z"); // 30 minutos
    const result = calculateFee(entryTime, exitMins, rules);
    expect(result).toBe(1500); // 30 mins * 50
  });

  // Pruebas para tarifas por segundo
  test("should calculate fee for second rate", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "segundo", amount: 1 }
    ];
    const exitSecs = new Date("2024-05-20T10:05:00Z"); // 5 minutos = 300 segundos
    const result = calculateFee(entryTime, exitSecs, rules);
    expect(result).toBe(300); // 300 segundos * 1
  });

  // Pruebas para tiempo de gracia de entrada
  test("should apply entry grace period correctly (0 fee)", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    const settings: PricingSettings = { entry_grace_period_mins: 15 };
    const earlyExit = new Date("2024-05-20T10:14:00Z"); // 14 mins (< 15 mins)
    const result = calculateFee(entryTime, earlyExit, rules, settings);
    expect(result).toBe(0);
  });

  test("should NOT apply entry grace period if time exceeded", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    const settings: PricingSettings = { entry_grace_period_mins: 15 };
    const lateExit = new Date("2024-05-20T10:16:00Z"); // 16 mins (> 15 mins)
    const result = calculateFee(entryTime, lateExit, rules, settings);
    expect(result).toBe(1000); // Se cobra 1 hora completa
  });

  // Pruebas de topes de turnos (Día y Noche) sin tiempos de gracia (para simplificar)
  test("should apply day shift limit (tope de día)", () => {
    // Entra a las 8 AM, sale a las 4 PM (8 horas)
    const entryDay = new Date("2024-05-20T08:00:00Z");
    const exitDay = new Date("2024-05-20T16:00:00Z");
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "dia", amount: 5000 } // Tope de día 5000
    ];
    const result = calculateFee(entryDay, exitDay, rules, { shift_grace_period_mins: 0 });
    // 8 horas * 1000 = 8000, debe toparse a 5000
    expect(result).toBe(5000);
  });

  test("should apply night shift limit (tope de noche)", () => {
    // Entra a las 8 PM, sale a las 2 AM (6 horas)
    const entryNight = new Date("2024-05-20T20:00:00Z");
    const exitNight = new Date("2024-05-21T02:00:00Z");
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "noche", amount: 4000 } // Tope de noche 4000
    ];
    const result = calculateFee(entryNight, exitNight, rules, { shift_grace_period_mins: 0 });
    // 6 horas * 1000 = 6000, debe toparse a 4000
    expect(result).toBe(4000);
  });

  // Pruebas cruzando turnos (Día -> Noche)
  test("should calculate correctly across day and night shifts", () => {
    // Turno día por defecto es 6:00 a 18:00
    // Entra a las 14:00 (4 horas del turno día)
    // Sale a las 22:00 (4 horas del turno noche)
    const crossEntry = new Date("2024-05-20T14:00:00Z");
    const crossExit = new Date("2024-05-20T22:00:00Z");
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "dia", amount: 3000 },
      { vehicle_type: "car", rate_type: "noche", amount: 3500 }
    ];
    const result = calculateFee(crossEntry, crossExit, rules, { shift_grace_period_mins: 0 });

    // Segmento Día (14:00 a 18:00): 4 horas = 4000, se topa a 3000
    // Segmento Noche (18:00 a 22:00): 4 horas = 4000, se topa a 3500
    // Total: 3000 + 3500 = 6500
    expect(result).toBe(6500);
  });

  // Pruebas de bloque de 12 horas
  test("should calculate block of 12h accurately", () => {
    // El bloque evalúa intervalos de 12h. Si entra 10 AM y sale 25 horas después (11 AM sig dia).
    const entryBlock = new Date("2024-05-20T10:00:00Z");
    const exitBlock = new Date("2024-05-21T11:00:00Z"); // 25 horas
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "bloque_12h", amount: 5000 }
    ];
    const result = calculateFee(entryBlock, exitBlock, rules, { shift_grace_period_mins: 0 });

    // Bloque 1 (10 AM a 10 PM) = 12 horas. 12000 -> topado a 5000
    // Bloque 2 (10 PM a 10 AM) = 12 horas. 12000 -> topado a 5000
    // Bloque 3 (10 AM a 11 AM) = 1 hora. 1000 -> topado a 5000? no, se cobra 1000.
    // Total = 5000 + 5000 + 1000 = 11000.
    expect(result).toBe(11000);
  });

  // Pruebas de Shift Grace Period (Gabela de Turnos)
  test("should apply shift grace period if user enters slightly before shift", () => {
    // Turno día empieza a las 06:00
    // Entra 05:45 (dentro del grace period de 15 min), sale a las 10:00.
    // Se debería ajustar la entrada a las 06:00
    const entryEarly = new Date("2024-05-20T05:45:00Z");
    const exitShift = new Date("2024-05-20T10:00:00Z");
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "dia", amount: 5000, start_time: "06:00", end_time: "18:00" },
      { vehicle_type: "car", rate_type: "noche", amount: 4000, start_time: "18:00" }
    ];
    // Por defecto shift_grace_period_mins es 15
    const result = calculateFee(entryEarly, exitShift, rules);

    // Como se ajusta a 06:00, el tiempo facturado es de 06:00 a 10:00 (4 horas)
    // 4 horas = 4000
    expect(result).toBe(4000);
  });

  test("should apply shift grace period if user exits slightly after shift", () => {
    // Turno de día termina (y noche empieza) a las 18:00.
    // Entra 15:00, sale 18:10 (dentro del grace period de 15 min de salida para noche).
    // Se debería ajustar la salida a las 18:00.
    const entryShift = new Date("2024-05-20T15:00:00Z");
    const exitLate = new Date("2024-05-20T18:10:00Z");
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 },
      { vehicle_type: "car", rate_type: "dia", amount: 5000, start_time: "06:00" },
      { vehicle_type: "car", rate_type: "noche", amount: 4000, start_time: "18:00" }
    ];
    const result = calculateFee(entryShift, exitLate, rules);

    // Se ajusta la salida a 18:00. Tiempo facturado de 15:00 a 18:00 (3 horas).
    expect(result).toBe(3000);
  });
});
