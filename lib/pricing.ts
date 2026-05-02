export interface TariffRule {
  vehicle_type: string;
  rate_type: string; // 'dia', 'noche', 'hora', 'minuto', 'segundo', 'mes', 'bloque_12h'
  amount: number;
  start_time?: string | null;
  end_time?: string | null;
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
    
    // Si la hora de noche es menor o igual a la de día (ej: noche empieza 00:00 y día a las 06:00), ajustable
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
          // If the accumulated cost exceeds the shift cost, cap it at shift cost
          segmentCost = Math.min(baseCost, rateShift);
       } else {
          // If only shift cost is specified
          segmentCost = rateShift;
       }
    }

    totalFee += segmentCost;
    currentMs = currentShiftEndMs;
  }

  return totalFee;
}

export function calculateFee(entryTime: Date, exitTime: Date, rules: TariffRule[]): number {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return 0;

  const entryMs = entryTime.getTime();
  const exitMs = exitTime.getTime();
  const durationMs = exitMs - entryMs;
  
  if (durationMs <= 0) return 0;

  const gracePeriodMs = 15 * 60000;
  if (durationMs <= gracePeriodMs) return 0;

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

