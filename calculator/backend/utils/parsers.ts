const { formatDateOnly } = require('./dateUtils');

function parseStrictDateOnly(value: unknown) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseWeeks(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const i = Math.trunc(value);
    return i > 0 ? i : null;
  }
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function parseTuitionFee(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const i = Math.trunc(value);
    return i >= 0 ? i : null;
  }
  const s = String(value).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 0 ? i : null;
}

function parseDiscount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0;
  return n;
}

function parseSkipWeeks(value: unknown) {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const raw of value) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 1) {
      set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function normalizeRecordingDates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function parseExcludeMath(value: unknown) {
  if (value === true || value === 'true') return true;
  if (value === 1 || value === '1') return true;
  return false;
}

function normalizeRegistrationIds(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || '').split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeEndDate(startDate: unknown, weeks: number | null, skipWeeks: unknown[] = []) {
  if (!startDate || !weeks) return '';
  const s =
    startDate instanceof Date
      ? startDate
      : typeof startDate === 'string' || typeof startDate === 'number'
        ? new Date(startDate)
        : null;
  if (!s) return '';
  if (Number.isNaN(s.getTime())) return '';
  const skipCount = Array.isArray(skipWeeks) ? skipWeeks.length : 0;
  const scheduleWeeks = Number(weeks) + Number(skipCount || 0);
  if (!Number.isFinite(scheduleWeeks) || scheduleWeeks <= 0) return '';
  const end = new Date(s);
  end.setUTCDate(s.getUTCDate() + scheduleWeeks * 7 - 1);
  return formatDateOnly(end);
}

module.exports = {
  parseStrictDateOnly,
  parseWeeks,
  parseTuitionFee,
  parseDiscount,
  parseSkipWeeks,
  normalizeRecordingDates,
  parseExcludeMath,
  normalizeRegistrationIds,
  computeEndDate,
};
