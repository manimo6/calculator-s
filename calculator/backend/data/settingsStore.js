const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

async function readAllSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeAllSettings(all) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(all, null, 2), 'utf8');
}

async function getSettings(username) {
  const all = await readAllSettings();
  return all[username] || {};
}

async function saveSettings(username, settings) {
  const all = await readAllSettings();
  all[username] = settings || {};
  await writeAllSettings(all);
  return all[username];
}

module.exports = {
  getSettings,
  saveSettings,
};
