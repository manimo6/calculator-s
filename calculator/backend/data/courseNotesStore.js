const fs = require('fs').promises;
const path = require('path');

const NOTES_FILE = path.join(__dirname, 'courseNotes.json');

async function readAll() {
  try {
    const data = await fs.readFile(NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(list) {
  await fs.writeFile(NOTES_FILE, JSON.stringify(list || [], null, 2), 'utf8');
}

async function listNotes() {
  return readAll();
}

async function saveNotes(list) {
  await writeAll(list || []);
  return list || [];
}

module.exports = {
  listNotes,
  saveNotes,
};
