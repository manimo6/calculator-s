const fs = require('fs').promises;
const { COURSE_CONFIG_SETS_FILE } = require('../config');

async function readCourseConfigSets() {
  try {
    const data = await fs.readFile(COURSE_CONFIG_SETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeCourseConfigSets(data) {
  await fs.writeFile(COURSE_CONFIG_SETS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readCourseConfigSets,
  writeCourseConfigSets,
};
