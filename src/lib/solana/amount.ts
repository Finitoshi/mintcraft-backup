export function convertTokenAmountToBaseUnits(
  amount: string,
  decimals: number
): bigint {
  const trimmed = amount.trim();
  if (!trimmed) {
    throw new Error('Amount is required');
  }

  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error('Decimals must be a non-negative integer');
  }

  const [wholePartRaw, fractionPartRaw = ''] = trimmed.split('.');
  const wholePart = wholePartRaw || '0';
  const fractionPart = fractionPartRaw || '';

  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionPart)) {
    throw new Error('Amount must be numeric');
  }

  if (fractionPart.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places`);
  }

  const base = BigInt(10) ** BigInt(decimals);
  const whole = BigInt(wholePart) * base;
  const fraction = fractionPart
    ? BigInt(fractionPart.padEnd(decimals, '0'))
    : BigInt(0);

  return whole + fraction;
}

export function formatTokenAmountFromBaseUnits(
  amount: bigint,
  decimals: number
): string {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionString = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  return `${whole.toString()}.${fractionString}`;
}
