export function calculateFee(entryTime: Date, exitTime: Date, tariff: any): number {
  if (!tariff) return 0;

  const entryMs = entryTime.getTime();
  const exitMs = exitTime.getTime();
  const durationMs = exitMs - entryMs;
  const durationMinutes = Math.floor(durationMs / 60000);

  // Free time check
  if (durationMinutes <= (tariff.free_minutes || 0)) {
    return 0;
  }

  // Calculate billable time
  const billableMinutes = durationMinutes - (tariff.free_minutes || 0);
  let totalFee = 0;

  // Simple block calculation
  if (tariff.charge_type === 'bloque') {
    const blockHours = tariff.block_hours || 12;
    const blocks = Math.ceil(billableMinutes / (blockHours * 60));
    // For simplicity, we'll just use the day rate for blocks
    return blocks * (tariff.day_rate || 0);
  }

  // Calculate day/night split
  // This is a simplified version. A full version would iterate through the time
  // and apply day/night rates based on the exact hours.
  // For this prototype, we'll use a simpler approach:
  // If we charge by minute, hour, or fraction, we calculate the total units.
  
  let units = 0;
  if (tariff.charge_type === 'minuto') units = billableMinutes;
  else if (tariff.charge_type === 'fraccion') units = Math.ceil(billableMinutes / 15);
  else if (tariff.charge_type === 'hora') units = Math.ceil(billableMinutes / 60);

  // Determine if it's mostly day or night (simplified)
  // A robust implementation would split the duration into day minutes and night minutes.
  const entryHour = entryTime.getHours();
  const dayStartHour = parseInt(tariff.day_start_time?.split(':')[0] || '6');
  const nightStartHour = parseInt(tariff.night_start_time?.split(':')[0] || '18');

  let isDay = entryHour >= dayStartHour && entryHour < nightStartHour;
  
  // If duration is long (e.g., > 12 hours), it spans both.
  // For simplicity in this prototype, we'll just apply the rate of the entry time.
  // In a real app, you'd calculate exact minutes in day vs night.
  let rate = isDay ? (tariff.day_rate || 0) : (tariff.night_rate || 0);

  // Fallback if one rate is 0 (solo_dia or solo_noche)
  if (rate === 0) {
    rate = tariff.day_rate > 0 ? tariff.day_rate : tariff.night_rate;
  }

  totalFee = units * rate;

  return totalFee;
}
