/**
 * Exact 2-decimal money arithmetic (cents as BigInt), mirroring the Python
 * Decimal math used for subtotals and order totals.
 */
export function toCents(value: string | number): bigint {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid decimal value: ${String(value)}`);
  }
  return BigInt(Math.round(n * 100));
}

export function multiplyCents(
  quantity: number,
  unitPrice: string | number
): bigint {
  return toCents(unitPrice) * BigInt(quantity);
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}
