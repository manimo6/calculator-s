const { normalizeCourseId, normalizeCourseConfigSetName } = require('../utils/dateUtils');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  isRegistrationAllowed,
  loadAccessContext,
  resolveCategoryForCourse,
} = require('./categoryAccessService');
const { prisma } = require('../db/prisma');

type CourseInput = { courseId?: string; courseName?: string; course?: string }
type RegistrationMutationRow = {
  id: string
  courseConfigSetName?: string | null
} & Record<string, unknown>

type RegistrationListRow = RegistrationMutationRow & {
  name?: string | null
  course?: string | null
  courseId?: string | null
  endDate?: Date | string | null
  timestamp?: Date | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  transferAt?: Date | string | null
  recordingDates?: unknown[] | null
}

type AuthUserLike = {
  id: string
  role?: string | null
} & Record<string, unknown>

async function loadTransferAccessState({
  authUser,
  existing,
  requestedCourseConfigSetName,
  course,
}: {
  authUser: AuthUserLike
  existing: RegistrationMutationRow
  requestedCourseConfigSetName?: string | null
  course: CourseInput
}) {
  const effectiveSetName =
    normalizeCourseConfigSetName(requestedCourseConfigSetName) ||
    normalizeCourseConfigSetName(existing.courseConfigSetName) ||
    ''

  if (!effectiveSetName) {
    return {
      effectiveSetName,
      sourceAllowed: false,
      targetAllowed: false,
      targetInSet: false,
    }
  }

  const bypassCategoryAccess = isCategoryAccessBypassed(authUser)
  const setNameCandidates = [
    normalizeCourseConfigSetName(existing.courseConfigSetName),
    effectiveSetName,
  ].filter((name): name is string => Boolean(name))
  const { accessMap, indexMap } = await loadAccessContext(
    authUser.id,
    setNameCandidates,
    bypassCategoryAccess
  )

  return {
    effectiveSetName,
    sourceAllowed: isRegistrationAllowed(
      existing,
      accessMap,
      indexMap,
      bypassCategoryAccess
    ),
    targetAllowed: isCourseAllowed(
      course,
      effectiveSetName,
      accessMap,
      indexMap,
      bypassCategoryAccess
    ),
    targetInSet: isCourseInSet(course, effectiveSetName, indexMap),
  }
}

function isCourseNameAllowed(
  courseName: string,
  setName: string,
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse({ courseName }, index);
  return isCategoryAllowed(category, access);
}

function isCourseAllowed(
  course: CourseInput,
  setName: string,
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse(course, index);
  return isCategoryAllowed(category, access);
}

function isCourseInSet(
  course: CourseInput,
  setName: string,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>
) {
  if (!setName) return false;
  const index = indexMap.get(setName);
  if (!index) return false;

  const courseId = normalizeCourseId(course?.courseId);
  if (courseId && index.idToCategory.has(courseId)) return true;

  const courseName = String(course?.courseName || course?.course || '').trim();
  if (!courseName) return false;
  if (index.labelToCategory.has(courseName)) return true;

  for (const base of index.labelBases || []) {
    if (courseName.startsWith(base)) return true;
  }

  return false;
}

async function loadAccessibleRegistrations(authUser: AuthUserLike) {
  const rows: RegistrationListRow[] = await prisma.registration.findMany({
    orderBy: [
      { name: 'asc' },
      { timestamp: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'asc' },
    ],
  });

  const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
  const setNames = rows
    .map((row: RegistrationListRow) => String(row.courseConfigSetName || '').trim())
    .filter(Boolean);
  const { accessMap, indexMap } = await loadAccessContext(
    authUser.id,
    setNames,
    bypassCategoryAccess
  );

  return rows.filter((row: RegistrationListRow) =>
    isRegistrationAllowed(row, accessMap, indexMap, bypassCategoryAccess)
  );
}

async function isRegistrationAccessAllowed(
  authUser: AuthUserLike,
  registrations: Array<RegistrationMutationRow | null | undefined>
) {
  const rows = registrations.filter(Boolean) as RegistrationMutationRow[]
  if (!rows.length) return false

  const bypassCategoryAccess = isCategoryAccessBypassed(authUser)
  const setNames = rows
    .map((row) => String(row.courseConfigSetName || '').trim())
    .filter(Boolean)
  const { accessMap, indexMap } = await loadAccessContext(
    authUser.id,
    setNames,
    bypassCategoryAccess
  )

  return rows.every((row) =>
    isRegistrationAllowed(row, accessMap, indexMap, bypassCategoryAccess)
  )
}

module.exports = {
  loadTransferAccessState,
  isCourseNameAllowed,
  isCourseAllowed,
  isCourseInSet,
  loadAccessibleRegistrations,
  isRegistrationAccessAllowed,
};
