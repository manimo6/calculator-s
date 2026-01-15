const HISTORY_KEY = "clipboardHistory";
export const CLIPBOARD_HISTORY_LIMIT = 10;

function createEntryId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const text = typeof entry.text === "string" ? entry.text : "";
  if (!text) return null;
  const studentName = typeof entry.studentName === "string" ? entry.studentName : "";
  const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString();
  const courses = Array.isArray(entry.courses) ? entry.courses.filter(Boolean) : [];
  const totalFee = Number.isFinite(entry.totalFee) ? entry.totalFee : 0;
  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : createEntryId(),
    studentName,
    createdAt,
    text,
    courses,
    totalFee,
  };
}

export function loadClipboardHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeEntry).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function saveClipboardHistoryEntry(entry) {
  const nextEntry = sanitizeEntry(entry);
  if (!nextEntry) return loadClipboardHistory();
  const current = loadClipboardHistory();
  const deduped = current.filter((item) => item && item.id !== nextEntry.id);
  const next = [nextEntry, ...deduped].slice(0, CLIPBOARD_HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (e) {
    return current;
  }
  return next;
}
