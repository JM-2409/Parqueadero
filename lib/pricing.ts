export function calculateFee(entryTime: Date, exitTime: Date, tariff: any): number {
  if (!tariff) return 0;

  const entryMs = entryTime.getTime();
  const exitMs = exitTime.getTime();
  const durationMs = exitMs - entryMs;
  
  if (durationMs <= 0) return 0;

  const totalMinutes = Math.floor(durationMs / 60000);

  // Free time check
  if (totalMinutes <= (tariff.free_minutes || 0)) {
    return 0;
  }

  const billableExitMs = exitMs;
  let currentMs = entryMs + ((tariff.free_minutes || 0) * 60000);

  const dayStartHour = parseInt(tariff.day_start_time?.split(':')[0] || '6');
  const dayStartMin = parseInt(tariff.day_start_time?.split(':')[1] || '0');
  const nightStartHour = parseInt(tariff.night_start_time?.split(':')[0] || '18');
  const nightStartMin = parseInt(tariff.night_start_time?.split(':')[1] || '0');

  // Accumulate minutes spent in day and night periods
  let dayMinutes = 0;
  let nightMinutes = 0;
  
  // We need the number of shifts touched for "turnos" mode
  let shiftsTouched = [];
  let currentShiftFeeAccumulator = 0;

  const gracePeriodMins = tariff.grace_period_minutes !== undefined ? tariff.grace_period_minutes : 15;
  const gracePeriodMs = gracePeriodMins * 60000;

  let iterations = 0;
  const maxIterations = 365 * 3; // Safety cap

  while (currentMs < billableExitMs && iterations < maxIterations) {
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

    const timeInThisShiftMs = Math.min(billableExitMs, currentShiftEndMs) - currentMs;
    const timeInThisShiftMins = Math.floor(timeInThisShiftMs / 60000);

    if (isDayShift) {
      dayMinutes += timeInThisShiftMins;
    } else {
      nightMinutes += timeInThisShiftMins;
    }

    // Turnos Mode Evaluation
    let chargeThisShift = true;
    // 1. If this is the FIRST shift touched, and they entered near the END of it (within grace period)
    if (currentMs === (entryMs + ((tariff.free_minutes || 0) * 60000)) && timeInThisShiftMs <= gracePeriodMs) {
      chargeThisShift = false;
    }
    // 2. If this is the LAST shift touched, and they exited near the START of it (within grace period)
    if (currentShiftEndMs >= billableExitMs && timeInThisShiftMs <= gracePeriodMs) {
      chargeThisShift = false;
    }
    
    if (chargeThisShift) {
      shiftsTouched.push({
        isDay: isDayShift,
        rate: isDayShift ? (tariff.day_rate || 0) : (tariff.night_rate || 0)
      });
    }

    currentMs = currentShiftEndMs;
  }

  const totalBillableMinutes = dayMinutes + nightMinutes;
  const dayRate = tariff.day_rate || 0;
  const nightRate = tariff.night_rate || 0;

  // Si no hay diferenciación estricta de precios (el cliente usa solo un campo)
  // O en modos normales, usamos tarifa ponderada
  
  if (tariff.charge_type === 'segundo') {
    const daySecs = dayMinutes * 60;
    const nightSecs = nightMinutes * 60;
    return (daySecs * dayRate) + (nightSecs * nightRate);
  } else if (tariff.charge_type === 'minuto') {
    return (dayMinutes * dayRate) + (nightMinutes * nightRate);
  } else if (tariff.charge_type === 'fraccion') {
    const fractionMins = tariff.fraction_minutes || 15;
    // Calculate total fractions
    const dayFractions = dayMinutes / fractionMins;
    const nightFractions = nightMinutes / fractionMins;
    
    // We sum fractions and ceil at the end, OR ceil independently? 
    // Usually, you ceil the total fractions, but proportional.
    // If it's pure proportionate: 
    if (dayRate === nightRate) {
      return Math.ceil(totalBillableMinutes / fractionMins) * dayRate;
    }
    // CEIL independently (e.g. 1 fraction of day, 1 fraction of night)
    return (Math.ceil(dayFractions) * dayRate) + (Math.ceil(nightFractions) * nightRate);
  } else if (tariff.charge_type === 'hora') {
    if (dayRate === nightRate) {
      return Math.ceil(totalBillableMinutes / 60) * dayRate;
    }
    return (Math.ceil(dayMinutes / 60) * dayRate) + (Math.ceil(nightMinutes / 60) * nightRate);
  } else if (tariff.charge_type === '12_horas') {
    return Math.ceil(totalBillableMinutes / (12 * 60)) * dayRate;
  } else if (tariff.charge_type === '24_horas') {
    return Math.ceil(totalBillableMinutes / (24 * 60)) * dayRate;
  } else if (tariff.charge_type === 'bloque') {
    const blockHours = tariff.block_hours || 12;
    return Math.ceil(totalBillableMinutes / (blockHours * 60)) * dayRate;
  } else if (tariff.charge_type === 'turnos') {
    // Calculamos los turnos tocados válidos
    return shiftsTouched.reduce((sum, shift) => sum + shift.rate, 0);
  }

  return 0;
}
