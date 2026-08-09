export const MAX_RISK_BASIS_POINTS = 10_000;

export function isRiskBasisPoints(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_RISK_BASIS_POINTS;
}

export function isValidReviewPeriod(start: Date, end: Date): boolean {
  return start.getTime() <= end.getTime();
}

export function isIsoCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}
