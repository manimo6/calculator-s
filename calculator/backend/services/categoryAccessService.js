const EFFECT_ALLOW = 'allow';
const EFFECT_DENY = 'deny';

function normalizeKey(value) {
  return String(value || '').trim();
}

function buildCourseTreeIndex(courseTree) {
  const idToCategory = new Map();
  const labelToCategory = new Map();
  const labelBases = [];
  const categories = new Set();

  for (const group of Array.isArray(courseTree) ? courseTree : []) {
    const category = normalizeKey(group?.cat);
    if (category) categories.add(category);
    for (const item of Array.isArray(group?.items) ? group.items : []) {
      const id = normalizeKey(item?.val);
      const label = normalizeKey(item?.label);
      if (id && category) idToCategory.set(id, category);
      if (label && category) {
        labelToCategory.set(label, category);
        labelBases.push(label);
      }
    }
  }

  labelBases.sort((a, b) => b.length - a.length);
  return { idToCategory, labelToCategory, labelBases, categories };
}

function resolveCategoryForCourse({ courseId, courseName }, index) {
  if (!index) return '';
  const id = normalizeKey(courseId);
  if (id && index.idToCategory.has(id)) return index.idToCategory.get(id);
  const label = normalizeKey(courseName);
  if (label) {
    if (index.labelToCategory.has(label)) return index.labelToCategory.get(label);
    for (const base of index.labelBases) {
      if (label.startsWith(base)) return index.labelToCategory.get(base) || '';
    }
  }
  return '';
}

function buildCategoryAccessMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const setName = normalizeKey(row?.courseConfigSetName);
    const categoryKey = normalizeKey(row?.categoryKey);
    if (!setName || !categoryKey) continue;
    if (!map.has(setName)) {
      map.set(setName, { allow: new Set(), deny: new Set(), hasRules: false });
    }
    const entry = map.get(setName);
    entry.hasRules = true;
    if (row.effect === EFFECT_DENY) {
      entry.deny.add(categoryKey);
    } else if (row.effect === EFFECT_ALLOW) {
      entry.allow.add(categoryKey);
    }
  }
  return map;
}

function getAccessForSet(accessMap, courseConfigSetName, bypassAccess = false) {
  if (bypassAccess) {
    return { allow: new Set(), deny: new Set(), hasRules: false, bypass: true };
  }
  const key = normalizeKey(courseConfigSetName);
  if (!key || !accessMap) {
    return { allow: new Set(), deny: new Set(), hasRules: false, bypass: false };
  }
  const entry =
    accessMap.get(key) || { allow: new Set(), deny: new Set(), hasRules: false };
  return { ...entry, bypass: false };
}

function getAllowedCategories(access) {
  if (access?.bypass) return null;
  if (!access?.hasRules) return new Set();
  if (!access.allow || access.allow.size === 0) return new Set();
  const allowed = new Set();
  for (const category of access.allow) {
    if (!access.deny?.has(category)) allowed.add(category);
  }
  return allowed;
}

function isCategoryAllowed(category, access) {
  const key = normalizeKey(category);
  if (access?.bypass) return true;
  if (!key) return true;
  if (!access?.hasRules) return false;
  if (access.deny?.has(key)) return false;
  if (!access.allow || access.allow.size === 0) return false;
  return access.allow.has(key);
}

function filterCourseTreeByAccess(courseTree, access) {
  if (access?.bypass) return Array.isArray(courseTree) ? courseTree : [];
  if (!access?.hasRules) return [];
  const allowedCategories = getAllowedCategories(access);
  if (!allowedCategories || allowedCategories.size === 0) return [];
  return (courseTree || []).filter((group) =>
    allowedCategories.has(normalizeKey(group?.cat))
  );
}

function collectCourseKeys(courseTree) {
  const ids = new Set();
  const labels = new Set();
  for (const group of Array.isArray(courseTree) ? courseTree : []) {
    for (const item of Array.isArray(group?.items) ? group.items : []) {
      const id = normalizeKey(item?.val);
      const label = normalizeKey(item?.label);
      if (id) ids.add(id);
      if (label) labels.add(label);
    }
  }
  return { ids, labels };
}

function filterObjectByKeys(source, allowedKeys) {
  if (!source || typeof source !== 'object') return {};
  const next = {};
  for (const [key, value] of Object.entries(source)) {
    if (allowedKeys.has(normalizeKey(key))) {
      next[key] = value;
    }
  }
  return next;
}

function filterCourseConfigSetData(data, access) {
  if (!data || typeof data !== 'object') return data;
  if (access?.bypass) return data;

  const filteredTree = filterCourseTreeByAccess(data.courseTree || [], access);
  const { ids: allowedIds, labels: allowedLabels } =
    collectCourseKeys(filteredTree);
  const allowedTimeKeys = new Set([...allowedIds, ...allowedLabels]);

  return {
    ...data,
    courseTree: filteredTree,
    courseInfo: filterObjectByKeys(data.courseInfo || {}, allowedIds),
    timeTable: filterObjectByKeys(data.timeTable || {}, allowedTimeKeys),
    recordingAvailable: filterObjectByKeys(
      data.recordingAvailable || {},
      allowedIds
    ),
  };
}

function mergeCourseConfigSetData(existing, incoming, access) {
  if (!access?.hasRules) return incoming;

  const allowedCategories = getAllowedCategories(access);
  if (!allowedCategories || allowedCategories.size === 0) return existing || incoming;

  const existingTree = Array.isArray(existing?.courseTree)
    ? existing.courseTree
    : [];
  const incomingTree = Array.isArray(incoming?.courseTree)
    ? incoming.courseTree
    : [];

  const allowedTree = incomingTree.filter((group) =>
    allowedCategories.has(normalizeKey(group?.cat))
  );
  const restrictedTree = existingTree.filter(
    (group) => !allowedCategories.has(normalizeKey(group?.cat))
  );

  const mergedTree = [...allowedTree, ...restrictedTree];
  const { ids: allowedIds, labels: allowedLabels } =
    collectCourseKeys(allowedTree);
  const allowedTimeKeys = new Set([...allowedIds, ...allowedLabels]);

  const mergedCourseInfo = {
    ...(existing?.courseInfo || {}),
    ...filterObjectByKeys(incoming?.courseInfo || {}, allowedIds),
  };
  const mergedTimeTable = {
    ...(existing?.timeTable || {}),
    ...filterObjectByKeys(incoming?.timeTable || {}, allowedTimeKeys),
  };
  const mergedRecordingAvailable = {
    ...(existing?.recordingAvailable || {}),
    ...filterObjectByKeys(incoming?.recordingAvailable || {}, allowedIds),
  };

  return {
    ...(existing || {}),
    ...(incoming || {}),
    courseTree: mergedTree,
    courseInfo: mergedCourseInfo,
    timeTable: mergedTimeTable,
    recordingAvailable: mergedRecordingAvailable,
  };
}

function buildCourseConfigSetIndexMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (!row?.name) continue;
    const courseTree = row?.data?.courseTree || [];
    map.set(row.name, buildCourseTreeIndex(courseTree));
  }
  return map;
}

function isCategoryAccessBypassed(user) {
  return String(user?.role || '').trim().toLowerCase() === 'master';
}

module.exports = {
  normalizeKey,
  buildCategoryAccessMap,
  getAccessForSet,
  buildCourseTreeIndex,
  resolveCategoryForCourse,
  getAllowedCategories,
  isCategoryAllowed,
  filterCourseTreeByAccess,
  filterCourseConfigSetData,
  mergeCourseConfigSetData,
  buildCourseConfigSetIndexMap,
  isCategoryAccessBypassed,
};
