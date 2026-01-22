const EFFECT_ALLOW = 'allow';
const EFFECT_DENY = 'deny';

type CourseTreeItem = { val?: string; label?: string }
type CourseTreeGroup = { cat?: string; items?: CourseTreeItem[] }
type CourseTree = CourseTreeGroup[]
type CategoryAccessRow = {
  courseConfigSetName?: string
  categoryKey?: string
  effect?: string
}
type CategoryAccess = {
  allow: Set<string>
  deny: Set<string>
  hasRules: boolean
  bypass?: boolean
}

function normalizeKey(value: unknown) {
  return String(value || '').trim();
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function buildCourseTreeIndex(courseTree: CourseTree) {
  const idToCategory = new Map<string, string>();
  const labelToCategory = new Map<string, string>();
  const labelBases: string[] = [];
  const categories = new Set<string>();

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

function resolveCategoryForCourse(
  { courseId, courseName }: { courseId?: string; courseName?: string },
  index: ReturnType<typeof buildCourseTreeIndex> | null
) {
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

function filterCourseTreeByAccess(courseTree: CourseTree, access: CategoryAccess | null | undefined) {
  if (access?.bypass) return Array.isArray(courseTree) ? courseTree : [];
  if (!access?.hasRules) return [];
  const allowedCategories = getAllowedCategories(access);
  if (!allowedCategories || allowedCategories.size === 0) return [];
  return (courseTree || []).filter((group) =>
    allowedCategories.has(normalizeKey(group?.cat))
  );
}

function collectCourseKeys(courseTree: CourseTree) {
  const ids = new Set<string>();
  const labels = new Set<string>();
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

function filterObjectByKeys(source: Record<string, unknown>, allowedKeys: Set<string>) {
  if (!source || typeof source !== 'object') return {};
  const next: Record<string, unknown> = {};
  const sourceRecord = source as Record<string, unknown>;
  for (const [key, value] of Object.entries(sourceRecord)) {
    if (allowedKeys.has(normalizeKey(key))) {
      next[key] = value;
    }
  }
  return next;
}

function filterCourseConfigSetData(
  data: Record<string, unknown>,
  access: CategoryAccess | null | undefined
) {
  if (!data || typeof data !== 'object') return data;
  if (access?.bypass) return data;

  const filteredTree = filterCourseTreeByAccess(
    Array.isArray(data.courseTree) ? data.courseTree : [],
    access
  );
  const { ids: allowedIds, labels: allowedLabels } =
    collectCourseKeys(filteredTree);
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
  const { ids: allowedIds, labels: allowedLabels } =
    collectCourseKeys(allowedTree);
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

function buildCourseConfigSetIndexMap(rows: Array<{ name?: string; data?: Record<string, unknown> }>) {
  const map = new Map<string, ReturnType<typeof buildCourseTreeIndex>>();
  for (const row of rows || []) {
    if (!row?.name) continue;
    const courseTree = Array.isArray(row?.data?.courseTree) ? row.data.courseTree : [];
    map.set(row.name, buildCourseTreeIndex(courseTree));
  }
  return map;
}

function isCategoryAccessBypassed(user: { role?: string } | null | undefined) {
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
