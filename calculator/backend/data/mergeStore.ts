const fs = require('fs').promises;
const path = require('path');

const MERGE_FILE = path.join(__dirname, 'mergeGroups.json');

type MergeGroup = Record<string, unknown>

async function readAll(): Promise<MergeGroup[]> {
  try {
    const data = await fs.readFile(MERGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(list: MergeGroup[]) {
  await fs.writeFile(MERGE_FILE, JSON.stringify(list || [], null, 2), 'utf8');
}

async function getMergeGroups() {
  return readAll();
}

async function saveMergeGroups(groups: MergeGroup[]) {
  await writeAll(groups || []);
  return groups || [];
}

module.exports = {
  getMergeGroups,
  saveMergeGroups,
};
