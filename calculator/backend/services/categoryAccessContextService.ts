const { EFFECT_ALLOW, EFFECT_DENY } = require('./permissionService');
const {
  asPlainRecord,
  buildCourseConfigSetIndexMap,
  collectCourseKeys,
  filterCourseTreeByAccess,
  filterObjectByKeys,
  normalizeKey,
  resolveCategoryForCourse,
} = require('./categoryAccessTreeService');

type CategoryAccessRow = {
  courseConfigSetName?: string;
  categoryKey?: string;
  effect?: string;
};

type CategoryAccess = {
  allow: Set<string>;
  deny: Set<string>;
  hasRules: boolean;
  bypass?: boolean;
};

function buildCategoryAccessMap(rows: CategoryAccessRow[]) {
  const map = new Map<string, CategoryAccess>();
  for (const row of rows || []) {
    const setName = normalizeKey(row?.courseConfigSetName);
    const categoryKey = normalizeKey(row?.categoryKey);
    if (!setName || !categoryKey) continue;
    if (!map.has(setName)) {
      map.set(setName, { allow: new Set<string>(), deny: new Set<string>(), hasRules: false });
    }
    const entry = map.get(setName);
    if (!entry) continue;
    entry.hasRules = true;
    if (row.effect === EFFECT_DENY) {
      entry.deny.add(categoryKey);
    } else if (row.effect === EFFECT_ALLOW) {
      entry.allow.add(categoryKey);
    }
  }
  return map;
}

function getAccessForSet(
  accessMap: Map<string, CategoryAccess>,
  courseConfigSetName: string,
  bypassAccess = false
) {
  if (bypassAccess) {
    return { allow: new Set<string>(), deny: new Set<string>(), hasRules: false, bypass: true };
  }
  const key = normalizeKey(courseConfigSetName);
  if (!key || !accessMap) {
    return { allow: new Set<string>(), deny: new Set<string>(), hasRules: false, bypass: false };
  }
  const entry =
    accessMap.get(key) || { allow: new Set<string>(), deny: new Set<string>(), hasRules: false };
  return { ...entry, bypass: false };
}

function getAllowedCategories(access: CategoryAccess | null | undefined) {
  if (access?.bypass) return null;
  if (!access?.hasRules) return new Set<string>();
  if (!access.allow || access.allow.size === 0) return new Set<string>();
  const allowed = new Set<string>();
  for (const category of access.allow) {
    if (!access.deny?.has(category)) allowed.add(category);
  }
  return allowed;
}

function isCategoryAllowed(category: string, access: CategoryAccess | null | undefined) {
  const key = normalizeKey(category);
  if (access?.bypass) return true;
  if (!key) return false;
  if (!access?.hasRules) return false;
  if (access.deny?.has(key)) return false;
  if (!access.allow || access.allow.size === 0) return false;
  return access.allow.has(key);
}

function filterCourseConfigSetData(
  data: Record<string, unknown>,
  access: CategoryAccess | null | undefined
) {
  if (!data || typeof data !== 'object') return data;
  if (access?.bypass) return data;

  const allowedCategories = getAllowedCategories(access);
  const filteredTree = filterCourseTreeByAccess(
    Array.isArray(data.courseTree) ? data.courseTree : [],
    access,
    allowedCategories
  );
  const { ids: allowedIds, labels: allowedLabels } = collectCourseKeys(filteredTree);
  const allowedTimeKeys = new Set<string>([...allowedIds, ...allowedLabels]);

  return {
    ...data,
    courseTree: filteredTree,
    courseInfo: filterObjectByKeys((data.courseInfo || {}) as Record<string, unknown>, allowedIds),
    timeTable: filterObjectByKeys((data.timeTable || {}) as Record<string, unknown>, allowedTimeKeys),
    recordingAvailable: filterObjectByKeys(
      (data.recordingAvailable || {}) as Record<string, unknown>,
      allowedIds
    ),
  };
}

function mergeCourseConfigSetData(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  access: CategoryAccess | null | undefined
) {
  if (!access?.hasRules) return existing || {};

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
  const { ids: allowedIds, labels: allowedLabels } = collectCourseKeys(allowedTree);
  const allowedTimeKeys = new Set<string>([...allowedIds, ...allowedLabels]);

  const mergedCourseInfo = {
    ...asPlainRecord(existing?.courseInfo),
    ...filterObjectByKeys(asPlainRecord(incoming?.courseInfo), allowedIds),
  };
  const mergedTimeTable = {
    ...asPlainRecord(existing?.timeTable),
    ...filterObjectByKeys(asPlainRecord(incoming?.timeTable), allowedTimeKeys),
  };
  const mergedRecordingAvailable = {
    ...asPlainRecord(existing?.recordingAvailable),
    ...filterObjectByKeys(asPlainRecord(incoming?.recordingAvailable), allowedIds),
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

function isCategoryAccessBypassed(user: { role?: string } | null | undefined) {
  return String(user?.role || '').trim().toLowerCase() === 'master';
}

async function loadAccessContext(
  userId: string,
  setNames: string[],
  bypassAccess = false
): Promise<{
  accessMap: ReturnType<typeof buildCategoryAccessMap>;
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>;
}> {
  const { prisma } = require('../db/prisma');
  const names = Array.from(new Set(setNames.filter(Boolean)));
  if (!names.length) {
    return { accessMap: new Map(), indexMap: new Map() };
  }
  const accessPromise = bypassAccess
    ? Promise.resolve([])
    : prisma.userCategoryAccess.findMany({
        where: { userId, courseConfigSetName: { in: names } },
        select: { courseConfigSetName: true, categoryKey: true, effect: true },
      });
  const setPromise = prisma.courseConfigSet.findMany({
    where: { name: { in: names } },
    select: { name: true, data: true },
  });
  const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
  return {
    accessMap: buildCategoryAccessMap(accessRows),
    indexMap: buildCourseConfigSetIndexMap(setRows),
  };
}

function isRegistrationAllowed(
  row: { courseId?: string; course?: string; courseConfigSetName?: string },
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
  const setName = String(row?.courseConfigSetName || '').trim();
  if (!setName) return true;
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse(
    { courseId: row?.courseId, courseName: row?.course },
    index
  );
  return isCategoryAllowed(category, access);
}

module.exports = {
  buildCategoryAccessMap,
  filterCourseConfigSetData,
  getAccessForSet,
  getAllowedCategories,
  isCategoryAccessBypassed,
  isCategoryAllowed,
  isRegistrationAllowed,
  loadAccessContext,
  mergeCourseConfigSetData,
};
