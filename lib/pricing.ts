export interface TariffRule {
  vehicle_type: string;
  rate_type: string; // 'dia', 'noche', 'hora', 'minuto', 'segundo', 'mes'
  amount: number;
}

export function calculateFee(entryTime: Date, exitTime: Date, rules: TariffRule[]): number {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return 0;

  const entryMs = entryTime.getTime();
  const exitMs = exitTime.getTime();
  const durationMs = exitMs - entryMs;
  if (durationMs <= 0) return 0;

  // Global settings
  const dayStartHour = 6;
  const dayStartMin = 0;
  const nightStartHour = 18;
  const nightStartMin = 0;
  const gracePeriodMs = 15 * 60000;
  
  if (durationMs <= gracePeriodMs) return 0;

  let currentMs = entryMs;
  let totalFee = 0;

  let iterations = 0;
  const maxIterations = 365 * 3;

  while (currentMs < exitMs && iterations < maxIterations) {
    iterations++;
    const currentDate = new Date(currentMs);
    
    // Day Shift Boundaries
    const dayShiftStart = new Date(currentDate);
    dayShiftStart.setHours(dayStartHour, dayStartMin, 0, 0);
    
    // Night Shift Boundaries
    const nightShiftStart = new Date(currentDate);
    nightShiftStart.setHours(nightStartHour, nightStartMin, 0, 0);
    
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

    const timeInThisShiftMs = Math.min(exitMs, currentShiftEndMs) - currentMs;
    const timeInThisShiftMins = Math.floor(timeInThisShiftMs / 60000);

    // Filter rules
    const rateMinuto = rules.find(r => r.rate_type === 'minuto')?.amount;
    const rateHora = rules.find(r => r.rate_type === 'hora')?.amount;
    const rateSegundo = rules.find(r => r.rate_type === 'segundo')?.amount;
    const rateShift = isDayShift 
      ? rules.find(r => r.rate_type === 'dia')?.amount 
      : rules.find(r => r.rate_type === 'noche')?.amount;

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
