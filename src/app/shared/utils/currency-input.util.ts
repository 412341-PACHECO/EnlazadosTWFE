export function formatArsIntegerInput(value: string | number | null | undefined): string {
  const digits = sanitizeArsIntegerInput(value);

  if (!digits) {
    return '';
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseArsIntegerInput(value: string | number | null | undefined): number {
  const digits = sanitizeArsIntegerInput(value);
  return digits ? Number(digits) : 0;
}

export function parseNullableArsIntegerInput(
  value: string | number | null | undefined,
): number | null {
  const digits = sanitizeArsIntegerInput(value);
  return digits ? Number(digits) : null;
}

function sanitizeArsIntegerInput(value: string | number | null | undefined): string {
  const digitsOnly = `${value ?? ''}`.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
  return normalized || '0';
}
