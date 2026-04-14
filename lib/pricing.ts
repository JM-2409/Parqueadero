export function calculateFee(entryTime: Date, exitTime: Date, tariff: any): number {
  if (!tariff) return 0;

  const entryMs = entryTime.getTime();
  const exitMs = exitTime.getTime();
  const durationMs = exitMs - entryMs;
  
  if (durationMs <= 0) return 0;

  const durationSeconds = Math.floor(durationMs / 1000);
  const durationMinutes = Math.floor(durationMs / 60000);

  // Free time check
  if (durationMinutes <= (tariff.free_minutes || 0)) {
    return 0;
  }

  const billableMinutes = durationMinutes - (tariff.free_minutes || 0);
  const billableSeconds = durationSeconds - ((tariff.free_minutes || 0) * 60);

  let totalFee = 0;

  // Simple block calculations
  if (tariff.charge_type === 'segundo') {
    return billableSeconds * (tariff.day_rate || 0);
  } else if (tariff.charge_type === 'minuto') {
    return billableMinutes * (tariff.day_rate || 0);
  } else if (tariff.charge_type === 'fraccion') {
    return Math.ceil(billableMinutes / 15) * (tariff.day_rate || 0);
  } else if (tariff.charge_type === 'hora') {
    return Math.ceil(billableMinutes / 60) * (tariff.day_rate || 0);
  } else if (tariff.charge_type === '12_horas') {
    return Math.ceil(billableMinutes / (12 * 60)) * (tariff.day_rate || 0);
  } else if (tariff.charge_type === '24_horas') {
    return Math.ceil(billableMinutes / (24 * 60)) * (tariff.day_rate || 0);
  } else if (tariff.charge_type === 'bloque') {
    const blockHours = tariff.block_hours || 12;
    return Math.ceil(billableMinutes / (blockHours * 60)) * (tariff.day_rate || 0);
  }

  // Shift-based calculation (Turnos: Día y Noche)
  if (tariff.charge_type === 'turnos') {
    const dayStartHour = parseInt(tariff.day_start_time?.split(':')[0] || '6');
    const dayStartMin = parseInt(tariff.day_start_time?.split(':')[1] || '0');
    const nightStartHour = parseInt(tariff.night_start_time?.split(':')[0] || '18');
    const nightStartMin = parseInt(tariff.night_start_time?.split(':')[1] || '0');
    
    const gracePeriodMins = tariff.grace_period_minutes !== undefined ? tariff.grace_period_minutes : 15;
    const gracePeriodMs = gracePeriodMins * 60000;

    // Adjust entry and exit times with grace period
    // If entered up to 15 mins before a shift, count as entering AT the shift start
    let adjustedEntryMs = entryMs;
    // If exited up to 15 mins after a shift ends, count as exiting AT the shift end
    let adjustedExitMs = exitMs;

    let currentMs = adjustedEntryMs;
    let fee = 0;
    
    // We will iterate day by day, shift by shift, until we reach adjustedExitMs
    // To prevent infinite loops, we cap at 365 days
    let iterations = 0;
    const maxIterations = 365 * 2; 

    while (currentMs < adjustedExitMs && iterations < maxIterations) {
      iterations++;
      const currentDate = new Date(currentMs);
      
      // Define shift boundaries for the current day
      const dayShiftStart = new Date(currentDate);
      dayShiftStart.setHours(dayStartHour, dayStartMin, 0, 0);
      
      const nightShiftStart = new Date(currentDate);
      nightShiftStart.setHours(nightStartHour, nightStartMin, 0, 0);
      
      const nextDayShiftStart = new Date(dayShiftStart);
      nextDayShiftStart.setDate(nextDayShiftStart.getDate() + 1);

      // Determine which shift we are currently in
      let currentShiftEndMs = 0;
      let currentShiftRate = 0;

      if (currentMs < dayShiftStart.getTime()) {
        // Previous night shift (from yesterday to today's dayShiftStart)
        currentShiftEndMs = dayShiftStart.getTime();
        currentShiftRate = tariff.night_rate || 0;
      } else if (currentMs >= dayShiftStart.getTime() && currentMs < nightShiftStart.getTime()) {
        // Current day shift
        currentShiftEndMs = nightShiftStart.getTime();
        currentShiftRate = tariff.day_rate || 0;
      } else {
        // Current night shift (from today's nightShiftStart to tomorrow's dayShiftStart)
        currentShiftEndMs = nextDayShiftStart.getTime();
        currentShiftRate = tariff.night_rate || 0;
      }

      // Apply grace periods to the boundaries
      const effectiveShiftStartMs = currentMs; // We are already inside or at the start
      const effectiveShiftEndMs = currentShiftEndMs;

      // Check if the actual entry was within the grace period BEFORE this shift started
      // If entry was 17:45, and night shift is 18:00, we don't charge the day shift if they entered just for the night shift.
      // Wait, the logic is: if they enter within 15 mins before a shift, they don't pay the PREVIOUS shift.
      // So if entry is 17:45, and day shift ends at 18:00. The time spent in day shift is 15 mins.
      // If time spent in a shift is <= grace period, and it's the FIRST shift they touch, maybe don't charge?
      
      const timeInThisShift = Math.min(adjustedExitMs, currentShiftEndMs) - currentMs;
      
      let chargeThisShift = true;

      // Grace period logic:
      // 1. If this is the FIRST shift touched, and they entered near the END of it (within grace period)
      if (currentMs === adjustedEntryMs && timeInThisShift <= gracePeriodMs) {
        chargeThisShift = false;
      }
      
      // 2. If this is the LAST shift touched, and they exited near the START of it (within grace period)
      if (currentShiftEndMs >= adjustedExitMs && timeInThisShift <= gracePeriodMs) {
        chargeThisShift = false;
      }

      if (chargeThisShift) {
        fee += currentShiftRate;
      }

      // Move to the next shift
      currentMs = currentShiftEndMs;
    }

    return fee;
  }

  return totalFee;
}
