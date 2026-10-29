function numericDigitsAfterSeparatorDeletion(
  value: string,
  previousValue: string,
  separator: string,
): string {
  const digits = value.replace(/\D/g, '');
  const deletedGeneratedSeparator = previousValue.endsWith(separator)
    && value === previousValue.slice(0, -1);
  return deletedGeneratedSeparator ? digits.slice(0, -1) : digits;
}

export function formatBirthDateInput(value: string, previousValue: string): string {
  const digits = numericDigitsAfterSeparatorDeletion(value, previousValue, '/').slice(0, 8);
  if (digits.length < 2) return digits;
  if (digits.length === 2) return `${digits}/`;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatBirthTimeInput(value: string, previousValue: string): string {
  const digits = numericDigitsAfterSeparatorDeletion(value, previousValue, ':').slice(0, 4);
  if (digits.length < 2) return digits;
  if (digits.length === 2) return `${digits}:`;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function birthDateToInputValue(value: string): string {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!isoMatch) return value;
  return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
}

export function birthDateInputToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
}
