const HISTORY_KEY = "clipboardHistory";
export const CLIPBOARD_HISTORY_LIMIT = 10;

type ClipboardHistoryEntry = {
  id: string;
  studentName: string;
  createdAt: string;
  text: string;
  courses: string[];
  totalFee: number;
};

function createEntryId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeEntry(entry: unknown): ClipboardHistoryEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text : "";
  if (!text) return null;
  const studentName =
    typeof record.studentName === "string" ? record.studentName : "";
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
  const courses = Array.isArray(record.courses)
    ? record.courses.filter(Boolean)
    : [];
  const totalFee = Number.isFinite(record.totalFee) ? Number(record.totalFee) : 0;
  return {
    id: typeof record.id === "string" && record.id ? record.id : createEntryId(),
    studentName,
    createdAt,
    text,
    courses,
    totalFee,
  };
}

export function loadClipboardHistory(): ClipboardHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeEntry)
      .filter((entry): entry is ClipboardHistoryEntry => Boolean(entry));
  } catch (e) {
    return [];
  }
}

export function saveClipboardHistoryEntry(entry: unknown): ClipboardHistoryEntry[] {
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
