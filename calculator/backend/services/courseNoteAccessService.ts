const { prisma } = require('../db/prisma');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  resolveCategoryForCourse,
} = require('./categoryAccessService');

type AuthUserLike = {
  id: string
} & Record<string, unknown>

type CourseNoteRow = {
  id?: string
  category?: string | null
  courses?: string[] | null
  course?: string | null
  title?: string | null
  content?: string | null
  tags?: string[] | null
  updatedAt?: Date | string | null
} & Record<string, unknown>

async function loadCourseNoteAccessContext(authUser: AuthUserLike, setName: string) {
  const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
  const accessPromise = bypassCategoryAccess
    ? Promise.resolve([])
    : prisma.userCategoryAccess.findMany({
        where: { userId: authUser.id, courseConfigSetName: setName },
        select: { courseConfigSetName: true, categoryKey: true, effect: true },
      });
  const setPromise = prisma.courseConfigSet.findMany({
    where: { name: { in: [setName] } },
    select: { name: true, data: true },
  });
  const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
  const access = getAccessForSet(
    buildCategoryAccessMap(accessRows),
    setName,
    bypassCategoryAccess
  );
  const indexMap = buildCourseConfigSetIndexMap(
    setRows as Array<{ name?: string; data?: Record<string, unknown> }>
  );

  return {
    access,
    index: indexMap.get(setName),
  };
}

function normalizeCourseList(
  courses: unknown,
  course: unknown,
  fallback: string[] = []
) {
  if (Array.isArray(courses)) {
    return courses.filter(Boolean).map(String);
  }
  if (course) {
    return [String(course)];
  }
  return fallback;
}

function isCourseListAllowed(
  courseList: string[],
  access: ReturnType<typeof getAccessForSet>,
  index: ReturnType<typeof buildCourseConfigSetIndexMap> extends Map<string, infer T> ? T | undefined : unknown
) {
  if (!index || !courseList.length) return true;
  const deniedCourse = courseList.find((courseName) => {
    const mappedCategory = resolveCategoryForCourse({ courseName }, index);
    return !isCategoryAllowed(mappedCategory, access);
  });
  return !deniedCourse;
}

function isCourseNoteAllowed(
  note: CourseNoteRow,
  access: ReturnType<typeof getAccessForSet>,
  index: ReturnType<typeof buildCourseConfigSetIndexMap> extends Map<string, infer T> ? T | undefined : unknown
) {
  if (!isCategoryAllowed(note.category, access)) return false;

  const courseList = Array.isArray(note.courses)
    ? note.courses.filter(Boolean).map(String)
    : note.course
      ? [String(note.course)]
      : [];

  return isCourseListAllowed(courseList, access, index);
}

function filterCourseNotes(
  notes: CourseNoteRow[],
  {
    category,
    course,
    search,
    access,
    index,
  }: {
    category?: unknown
    course?: unknown
    search?: unknown
    access: ReturnType<typeof getAccessForSet>
    index: ReturnType<typeof buildCourseConfigSetIndexMap> extends Map<string, infer T> ? T | undefined : unknown
  }
) {
  const selectedCourse = String(course || '').trim();
  const courseCategory =
    selectedCourse && index
      ? resolveCategoryForCourse({ courseName: selectedCourse }, index)
      : '';

  return notes
    .map((note) => ({
      ...note,
      courses: Array.isArray(note.courses)
        ? note.courses
        : note.course
          ? [note.course]
          : [],
    }))
    .filter((note) => {
      if (category && note.category !== category) return false;
      if (!isCourseNoteAllowed(note, access, index)) return false;

      if (selectedCourse && !note.courses.includes(selectedCourse)) {
        if (note.courses.length === 0) {
          if (!category && (!courseCategory || note.category !== courseCategory)) {
            return false;
          }
        } else {
          return false;
        }
      }

      if (search) {
        const searchText = String(search).toLowerCase();
        const haystack =
          `${note.title || ''} ${note.content || ''} ${Array.isArray(note.tags) ? note.tags.join(' ') : ''}`
            .toLowerCase();
        if (!haystack.includes(searchText)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
}

module.exports = {
  filterCourseNotes,
  isCourseListAllowed,
  isCourseNoteAllowed,
  loadCourseNoteAccessContext,
  normalizeCourseList,
};
