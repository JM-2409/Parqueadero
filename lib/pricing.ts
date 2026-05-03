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
    const currentDate = new Date(currentMs);
    
    const dayShiftStart = new Date(currentDate);
    dayShiftStart.setHours(dayStartHour, dayStartMin, 0, 0);
    
    const nightShiftStart = new Date(currentDate);
    nightShiftStart.setHours(nightStartHour, nightStartMin, 0, 0);
    
    if (nightShiftStart.getTime() <= dayShiftStart.getTime()) {
      nightShiftStart.setDate(nightShiftStart.getDate() + 1);
    }
    
    const nextDayShiftStart = new Date(dayShiftStart);
    nextDayShiftStart.setDate(nextDayShiftStart.getDate() + 1);

    let currentShiftEndMs = 0;
    let isDayShift = true;

    if (currentMs < dayShiftStart.getTime()) {
      currentShiftEndMs = dayShiftStart.getTime();
      isDayShift = false;
    } else if (currentMs >= dayShiftStart.getTime() && currentMs < nightShiftStart.getTime()) {
      currentShiftEndMs = nightShiftStart.getTime();
      isDayShift = true;
    } else {
      currentShiftEndMs = nextDayShiftStart.getTime();
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

export function calculateFee(entryTime: Date, exitTime: Date, rules: TariffRule[], settings?: PricingSettings): number {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return 0;

  // Use provided settings or defaults
  const entryGraceMins = settings?.entry_grace_period_mins !== undefined ? settings.entry_grace_period_mins : 0;
  const shiftGraceMins = settings?.shift_grace_period_mins !== undefined ? settings.shift_grace_period_mins : 15;

  let entryMs = entryTime.getTime();
  let exitMs = exitTime.getTime();
  let durationMs = exitMs - entryMs;
  
  if (durationMs <= 0) return 0;

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

    const checkAndAdjustEntryToShift = (baseDate: Date, targetHour: number, targetMin: number) => {
      let shiftDate = new Date(baseDate);
      shiftDate.setHours(targetHour, targetMin, 0, 0);
      let diff = shiftDate.getTime() - entryMs;
      // If entry was just BEFORE shift starts (within grace period)
      if (diff > 0 && diff <= shiftGraceMs) {
        entryMs = shiftDate.getTime();
      }
    };

    const checkAndAdjustExitToShift = (baseDate: Date, targetHour: number, targetMin: number) => {
      let shiftDate = new Date(baseDate);
      shiftDate.setHours(targetHour, targetMin, 0, 0);
      let diff = exitMs - shiftDate.getTime();
      // If exit was just AFTER shift ends (within grace period)
      if (diff > 0 && diff <= shiftGraceMs) {
        exitMs = shiftDate.getTime();
      }
    };

    // Check yesterday, today, and tomorrow for shifts relative to entry/exit
    for (let offset = -1; offset <= 1; offset++) {
      let tempEntryDate = new Date(entryMs);
      tempEntryDate.setDate(tempEntryDate.getDate() + offset);
      checkAndAdjustEntryToShift(tempEntryDate, dayStartHour, dayStartMin);
      checkAndAdjustEntryToShift(tempEntryDate, nightStartHour, nightStartMin);
      
      let tempExitDate = new Date(exitMs);
      tempExitDate.setDate(tempExitDate.getDate() + offset);
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

