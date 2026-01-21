const fs = require('fs').promises;
const path = require('path');

const NOTES_FILE = path.join(__dirname, 'courseNotes.json');

type CourseNote = Record<string, unknown>

async function readAll(): Promise<CourseNote[]> {
  try {
    const data = await fs.readFile(NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(list: CourseNote[]) {
  await fs.writeFile(NOTES_FILE, JSON.stringify(list || [], null, 2), 'utf8');
}

async function listNotes() {
  return readAll();
}

async function saveNotes(list: CourseNote[]) {
  await writeAll(list || []);
  return list || [];
}

module.exports = {
  listNotes,
  saveNotes,
};
