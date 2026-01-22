const fs = require('fs').promises;
const path = require('path');

const NOTICES_FILE = path.join(__dirname, 'notices.json');

type NoticeRecord = Record<string, unknown> & { id?: string | number }

async function readAll(): Promise<NoticeRecord[]> {
  try {
    const data = await fs.readFile(NOTICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(notices: NoticeRecord[]) {
  await fs.writeFile(NOTICES_FILE, JSON.stringify(notices, null, 2), 'utf8');
}

async function listNotices() {
  return readAll();
}

async function addNotice(notice: NoticeRecord) {
  const list = await readAll();
  list.push(notice);
  await writeAll(list);
  return notice;
}

async function updateNotice(
  id: string | number,
  updater: Record<string, unknown>
) {
  const list = await readAll();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...updater };
  list[idx] = updated;
  await writeAll(list);
  return updated;
}

async function deleteNotice(id: string | number) {
  const list = await readAll();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  await writeAll(list);
  return true;
}

module.exports = {
  listNotices,
  addNotice,
  updateNotice,
  deleteNotice,
};
