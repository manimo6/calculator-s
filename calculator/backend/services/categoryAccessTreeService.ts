type CourseTreeItem = { val?: string; label?: string };
type CourseTreeGroup = { cat?: string; items?: CourseTreeItem[] };
type CourseTree = CourseTreeGroup[];

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

function filterCourseTreeByAccess(
  courseTree: CourseTree,
  access: { bypass?: boolean; hasRules?: boolean } | null | undefined,
  allowedCategories: Set<string> | null
) {
  if (access?.bypass) return Array.isArray(courseTree) ? courseTree : [];
  if (!access?.hasRules) return [];
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

function buildCourseConfigSetIndexMap(rows: Array<{ name?: string; data?: Record<string, unknown> }>) {
  const map = new Map<string, ReturnType<typeof buildCourseTreeIndex>>();
  for (const row of rows || []) {
    if (!row?.name) continue;
    const courseTree = Array.isArray(row?.data?.courseTree) ? row.data.courseTree : [];
    map.set(row.name, buildCourseTreeIndex(courseTree));
  }
  return map;
}

module.exports = {
  asPlainRecord,
  buildCourseConfigSetIndexMap,
  buildCourseTreeIndex,
  collectCourseKeys,
  filterCourseTreeByAccess,
  filterObjectByKeys,
  normalizeKey,
  resolveCategoryForCourse,
};
