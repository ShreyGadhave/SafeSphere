/**
 * Phone numbers for emergency contacts and profiles. Stored in E.164-like form (`+919876543210`)
 * so SMS and calls work from any SIM. Must satisfy the database check `^\+?[0-9 ]{8,16}$`.
 */

export const PHONE_DB_PATTERN = /^\+?[0-9 ]{8,16}$/;

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Normalizes what people type or what a phone book returns. Indian mobile numbers in any common
 * shape (`98765 43210`, `098765-43210`, `+91 98765 43210`, `0091…`) become `+919876543210`.
 * Other numbers keep their digits. Returns null when it can't be a real number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  const hasPlus = digits.startsWith('+');
  digits = digits.replace(/\+/g, '');

  if (hasPlus) {
    if (digits.startsWith('91') && digits.length !== 12) return null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (INDIAN_MOBILE.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0') && INDIAN_MOBILE.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && INDIAN_MOBILE.test(digits.slice(2))) {
    return `+${digits}`;
  }
  // Landlines / other formats: keep the digits if they fit the stored format.
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return normalized != null && PHONE_DB_PATTERN.test(normalized);
}

/** `+919876543210` → `+91 98765 43210`; anything else is returned unchanged. */
export function formatPhone(phone: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
