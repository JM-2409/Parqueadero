export interface TariffRule {
  vehicle_type: string;
  rate_type: string; // 'dia', 'noche', 'hora', 'minuto', 'segundo', 'mes', 'bloque_12h'
  amount: number;
  start_time?: string | null;
  end_time?: string | null;
}

export interface PricingSettings {
  entry_grace_period_mins?: number;
  shift_grace_period_mins?: number;
}

export interface SpecialTariff {
  id?: string;
  parking_lot_id?: string;
  plate: string;
  rate_type: string; // 'dia', 'hora', 'minuto', 'fijo'
  amount: number;
  start_date: string | Date;
  end_date?: string | Date | null;
  description?: string | null;
  is_active?: boolean;
}

const PARKING_TIME_ZONE = "America/Bogota";
const parkingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARKING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

interface ParkingDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getParkingDateParts(timestamp: number): ParkingDateParts {
  const parts = parkingDateTimeFormatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

function addCalendarDays(date: Pick<ParkingDateParts, "year" | "month" | "day">, days: number) {
  const nextDate = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate()
  };
}

function getParkingTimestamp(
  date: Pick<ParkingDateParts, "year" | "month" | "day">,
  hour: number,
  minute: number
): number {
  const targetAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let timestamp = targetAsUtc;

  for (let attempt = 0; attempt < 2; attempt++) {
    const local = getParkingDateParts(timestamp);
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );
    timestamp = targetAsUtc - (localAsUtc - timestamp);
  }

  return timestamp;
}

function calculateIntervalCost(startMs: number, endMs: number, rules: TariffRule[]): number {
  let currentMs = startMs;
  let totalFee = 0;
  let iterations = 0;
  const maxIterations = 365 * 3;

  const ruleDia = rules.find(r => r.rate_type === 'dia');
  const ruleNoche = rules.find(r => r.rate_type === 'noche');

  let dayStartHour = 6, dayStartMin = 0;
  let nightStartHour = 18, nightStartMin = 0;

  if (ruleDia?.start_time) {
    const [h, m] = ruleDia.start_time.split(':');
    dayStartHour = parseInt(h, 10) || 6;
    dayStartMin = parseInt(m, 10) || 0;
  }
  if (ruleNoche?.start_time) {
    const [h, m] = ruleNoche.start_time.split(':');
    nightStartHour = parseInt(h, 10) || 18;
    nightStartMin = parseInt(m, 10) || 0;
  } else if (ruleDia?.end_time) {
    const [h, m] = ruleDia.end_time.split(':');
    nightStartHour = parseInt(h, 10) || 18;
    nightStartMin = parseInt(m, 10) || 0;
  }

  while (currentMs < endMs && iterations < maxIterations) {
    iterations++;
    const currentDate = getParkingDateParts(currentMs);
    const dayShiftStart = getParkingTimestamp(currentDate, dayStartHour, dayStartMin);
    const nightShiftDate = getParkingTimestamp(currentDate, nightStartHour, nightStartMin);
    let nightShiftStart = nightShiftDate;

    if (nightShiftStart <= dayShiftStart) {
      nightShiftStart = getParkingTimestamp(addCalendarDays(currentDate, 1), nightStartHour, nightStartMin);
    }

    const nextDayShiftStart = getParkingTimestamp(addCalendarDays(currentDate, 1), dayStartHour, dayStartMin);

    let currentShiftEndMs = 0;
    let isDayShift = true;

    if (currentMs < dayShiftStart) {
      currentShiftEndMs = dayShiftStart;
      isDayShift = false;
    } else if (currentMs >= dayShiftStart && currentMs < nightShiftStart) {
      currentShiftEndMs = nightShiftStart;
      isDayShift = true;
    } else {
      currentShiftEndMs = nextDayShiftStart;
      isDayShift = false;
    }

    const timeInThisShiftMs = Math.min(endMs, currentShiftEndMs) - currentMs;
    const timeInThisShiftMins = Math.floor(timeInThisShiftMs / 60000);

    const rateMinuto = rules.find(r => r.rate_type === 'minuto')?.amount;
    const rateHora = rules.find(r => r.rate_type === 'hora')?.amount;
    const rateSegundo = rules.find(r => r.rate_type === 'segundo')?.amount;
    const rateShift = isDayShift ? ruleDia?.amount : ruleNoche?.amount;

    let baseCost = Infinity;
    let anyBaseRule = false;

    if (rateMinuto !== undefined) {
      baseCost = Math.min(baseCost, timeInThisShiftMins * rateMinuto);
      anyBaseRule = true;
    }
    if (rateHora !== undefined) {
      const hours = Math.ceil(timeInThisShiftMins / 60);
      baseCost = Math.min(baseCost, hours * rateHora);
      anyBaseRule = true;
    }
    if (rateSegundo !== undefined) {
      const seconds = timeInThisShiftMins * 60;
      baseCost = Math.min(baseCost, seconds * rateSegundo);
      anyBaseRule = true;
    }

    if (!anyBaseRule) {
      baseCost = 0;
    }

    let segmentCost = baseCost;

    if (rateShift !== undefined) {
       if (anyBaseRule) {
          segmentCost = Math.min(baseCost, rateShift);
       } else {
          segmentCost = rateShift;
       }
    }

    totalFee += segmentCost;
    currentMs = currentShiftEndMs;
  }

  return totalFee;
}

export function formatDateKey(date: Date): string {
  const { year, month, day } = getParkingDateParts(date.getTime());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calculateFee(
  entryTime: Date,
  exitTime: Date,
  rules: TariffRule[],
  settings?: PricingSettings,
  specialTariffs?: SpecialTariff[],
  pastPaidDates?: string[]
): number {
  let entryMs = entryTime.getTime();
  let exitMs = exitTime.getTime();
  let durationMs = exitMs - entryMs;

  if (durationMs <= 0) return 0;

  // Check if there is an active matching special tariff for this plate
  if (specialTariffs && specialTariffs.length > 0) {
    const activeSpecial = specialTariffs.find((st) => {
      if (st.is_active === false) return false;
      const stStartMs = new Date(st.start_date).getTime();
      const stEndMs = st.end_date ? new Date(st.end_date).getTime() : Infinity;
      return exitMs > stStartMs && entryMs < stEndMs;
    });

    if (activeSpecial) {
      const stStartMs = new Date(activeSpecial.start_date).getTime();
      const stEndMs = activeSpecial.end_date ? new Date(activeSpecial.end_date).getTime() : Infinity;

      const specialStartMs = Math.max(entryMs, stStartMs);
      const specialEndMs = Math.min(exitMs, stEndMs);

      let totalFee = 0;

      // 1. Segment BEFORE special tariff (Normal rules)
      if (entryMs < specialStartMs && rules && rules.length > 0) {
        totalFee += calculateFee(entryTime, new Date(specialStartMs), rules, settings);
      }

      // 2. Segment DURING special tariff
      if (specialStartMs < specialEndMs) {
        const rateType = activeSpecial.rate_type || 'dia';
        if (rateType === 'dia' || rateType === 'fijo_diario') {
          // Iterate day by day from 00:00 to 24:00
          const paidSet = new Set(pastPaidDates || []);
          let currentCursor = specialStartMs;

          while (currentCursor < specialEndMs) {
            const currentDate = getParkingDateParts(currentCursor);
            const dateKey = formatDateKey(new Date(currentCursor));

            if (!paidSet.has(dateKey)) {
              totalFee += Number(activeSpecial.amount) || 0;
            }

            // Move cursor to start of next day (00:00:00)
            currentCursor = getParkingTimestamp(addCalendarDays(currentDate, 1), 0, 0);
          }
        } else if (rateType === 'hora') {
          const durationMins = Math.ceil((specialEndMs - specialStartMs) / 60000);
          const hours = Math.ceil(durationMins / 60);
          totalFee += hours * (Number(activeSpecial.amount) || 0);
        } else if (rateType === 'minuto') {
          const durationMins = Math.floor((specialEndMs - specialStartMs) / 60000);
          totalFee += durationMins * (Number(activeSpecial.amount) || 0);
        } else if (rateType === 'fijo') {
          totalFee += Number(activeSpecial.amount) || 0;
        }
      }

      // 3. Segment AFTER special tariff (Normal rules)
      if (specialEndMs < exitMs && rules && rules.length > 0) {
        totalFee += calculateFee(new Date(specialEndMs), exitTime, rules, settings);
      }

      return totalFee;
    }
  }

  if (!rules || !Array.isArray(rules) || rules.length === 0) return 0;

  // Use provided settings or defaults
  const entryGraceMins = settings?.entry_grace_period_mins !== undefined ? settings.entry_grace_period_mins : 0;
  const shiftGraceMins = settings?.shift_grace_period_mins !== undefined ? settings.shift_grace_period_mins : 15;

  // 1. Gabela inicial (grace period entry) (ej. si sale antes de 15 min, paga 0)
  const entryGraceMs = Math.max(0, entryGraceMins * 60000);
  if (durationMs <= entryGraceMs && entryGraceMs > 0) return 0;

  // 2. Shift adjustments (gabela turnos) (ej., entra 05:45 (shift a las 06:00), se ajusta a las 06:00)
  // And si sale 06:15, se ajusta a las 06:00
  const shiftGraceMs = Math.max(0, shiftGraceMins * 60000);
  
  if (shiftGraceMs > 0) {
    const ruleDia = rules.find(r => r.rate_type === 'dia');
    const ruleNoche = rules.find(r => r.rate_type === 'noche');

    let dayStartHour = 6, dayStartMin = 0;
    let nightStartHour = 18, nightStartMin = 0;

    if (ruleDia?.start_time) {
      const [h, m] = ruleDia.start_time.split(':');
      dayStartHour = parseInt(h, 10) || 6;
      dayStartMin = parseInt(m, 10) || 0;
    }
    if (ruleNoche?.start_time) {
      const [h, m] = ruleNoche.start_time.split(':');
      nightStartHour = parseInt(h, 10) || 18;
      nightStartMin = parseInt(m, 10) || 0;
    } else if (ruleDia?.end_time) {
      const [h, m] = ruleDia.end_time.split(':');
      nightStartHour = parseInt(h, 10) || 18;
      nightStartMin = parseInt(m, 10) || 0;
    }

    const checkAndAdjustEntryToShift = (
      baseDate: Pick<ParkingDateParts, "year" | "month" | "day">,
      targetHour: number,
      targetMin: number
    ) => {
      const shiftTimestamp = getParkingTimestamp(baseDate, targetHour, targetMin);
      const diff = shiftTimestamp - entryMs;
      // If entry was BEFORE shift starts (within grace period), and exit is AFTER shift starts
      if (diff > 0 && diff <= shiftGraceMs && exitMs >= shiftTimestamp) {
        entryMs = shiftTimestamp;
      }
    };

    const checkAndAdjustExitToShift = (
      baseDate: Pick<ParkingDateParts, "year" | "month" | "day">,
      targetHour: number,
      targetMin: number
    ) => {
      const shiftTimestamp = getParkingTimestamp(baseDate, targetHour, targetMin);
      const diff = exitMs - shiftTimestamp;
      // If exit was AFTER shift ends (within grace period), and entry is explicitly BEFORE shift ends
      if (diff > 0 && diff <= shiftGraceMs && entryMs < shiftTimestamp) {
        exitMs = shiftTimestamp;
      }
    };

    // Check yesterday, today, and tomorrow for shifts relative to entry/exit
    for (let offset = -1; offset <= 1; offset++) {
      const tempEntryDate = addCalendarDays(getParkingDateParts(entryMs), offset);
      checkAndAdjustEntryToShift(tempEntryDate, dayStartHour, dayStartMin);
      checkAndAdjustEntryToShift(tempEntryDate, nightStartHour, nightStartMin);
      
      const tempExitDate = addCalendarDays(getParkingDateParts(exitMs), offset);
      checkAndAdjustExitToShift(tempExitDate, dayStartHour, dayStartMin);
      checkAndAdjustExitToShift(tempExitDate, nightStartHour, nightStartMin);
    }
    
    // Safety check in case adjustments flip entry and exit
    if (entryMs >= exitMs) {
      exitMs = entryMs + 60000; // Adds 1 minute to trigger the new shift's base rate
    }
  }

  // Update duration after adjustments
  durationMs = exitMs - entryMs;

  const block12h = rules.find(r => r.rate_type === 'bloque_12h')?.amount;

  if (block12h !== undefined) {
    let total = 0;
    let current = entryMs;
    const interval12h = 12 * 60 * 60 * 1000;
    
    while (current < exitMs) {
      let next = Math.min(exitMs, current + interval12h);
      let cost = calculateIntervalCost(current, next, rules);
      total += Math.min(cost, block12h);
      current = next;
    }
    return total;
  } else {
    return calculateIntervalCost(entryMs, exitMs, rules);
  }
}
