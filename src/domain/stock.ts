/**
 * Stock forecasting. One stock item can supply several medications, even for different
 * people, so daily use is summed across every medication linked to it.
 */
export type StockForecast = { daysLeft: number; low: boolean };

export function forecastStock(quantityOnHand: number, dailyUses: number[], thresholdDays = 5): StockForecast {
  const perDay = dailyUses.reduce((a, b) => a + b, 0);
  if (perDay <= 0) return { daysLeft: Infinity, low: false };
  const daysLeft = Math.floor(quantityOnHand / perDay);
  return { daysLeft, low: daysLeft <= thresholdDays };
}
