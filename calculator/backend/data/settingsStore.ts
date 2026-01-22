const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

type SettingsRecord = Record<string, unknown>

async function readAllSettings(): Promise<Record<string, SettingsRecord>> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeAllSettings(all: Record<string, SettingsRecord>) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(all, null, 2), 'utf8');
}

async function getSettings(username: string) {
  const all = await readAllSettings();
  return all[username] || {};
}

async function saveSettings(username: string, settings: SettingsRecord) {
  const all = await readAllSettings();
  all[username] = settings || {};
  await writeAllSettings(all);
  return all[username];
}

module.exports = {
  getSettings,
  saveSettings,
};
