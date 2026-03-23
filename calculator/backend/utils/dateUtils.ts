function formatDateOnly(date: string | number | Date | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeStringId(value: unknown) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

const normalizeCourseId = normalizeStringId;
const normalizeCourseConfigSetName = normalizeStringId;

module.exports = { formatDateOnly, parseDateOnly, normalizeStringId, normalizeCourseId, normalizeCourseConfigSetName };
