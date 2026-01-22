const fs = require('fs').promises;
const { DATA_FILE } = require('../config');

async function readCourses(): Promise<unknown> {
  const data = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeCourses(newData: unknown) {
  await fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8');
}

module.exports = {
  readCourses,
  writeCourses,
};
