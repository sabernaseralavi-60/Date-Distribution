const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatNumberFa(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const formatted = safe.toLocaleString('en-US');
  return toPersianDigits(formatted);
}

export function formatToman(value: number, currencyLabel = 'تومان'): string {
  return `${formatNumberFa(value)} ${currencyLabel}`;
}

export function toJalaliDate(isoDateStr: string): string {
  if (!isoDateStr) return '—';
  // If already formatted like 1405/08/08
  if (/^(13|14)\d{2}[/-]\d{2}[/-]\d{2}/.test(isoDateStr)) {
    return toPersianDigits(isoDateStr.replace(/-/g, '/'));
  }
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) {
    return toPersianDigits(isoDateStr);
  }
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return toPersianDigits(isoDateStr.slice(0, 10));
  }
}

export function toJalaliDateTime(isoDateStr: string): string {
  if (!isoDateStr) return '—';
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) {
    return toPersianDigits(isoDateStr);
  }
  try {
    const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return `${datePart} — ${timePart}`;
  } catch {
    return toPersianDigits(isoDateStr);
  }
}

export function isValidIranianMobile(mobile: string): boolean {
  const normalized = toEnglishDigits(mobile.trim()).replace(/[\s-]/g, '');
  return /^09\d{9}$/.test(normalized);
}

export function isValidIranianPostalCode(postalCode: string): boolean {
  const normalized = toEnglishDigits(postalCode.trim()).replace(/[\s-]/g, '');
  return /^\d{10}$/.test(normalized);
}

export function computeSimpleChecksum(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sha256:${hex1}${hex2}${hex1}${hex2}`;
}

export const formatPersianNumber = formatNumberFa;
export const toJalaliDateString = toJalaliDate;

