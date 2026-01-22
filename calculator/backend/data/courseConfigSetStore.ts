const fs = require('fs').promises;
const { COURSE_CONFIG_SETS_FILE } = require('../config');

async function readCourseConfigSets(): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(COURSE_CONFIG_SETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeCourseConfigSets(data: Record<string, unknown>) {
  await fs.writeFile(COURSE_CONFIG_SETS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readCourseConfigSets,
  writeCourseConfigSets,
};
