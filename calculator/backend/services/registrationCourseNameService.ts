const { Prisma } = require('@prisma/client');
const { prisma } = require('../db/prisma');
const {
  isCategoryAccessBypassed,
  loadAccessContext,
} = require('./categoryAccessService');
const { isCourseNameAllowed } = require('./registrationAccessService');

type AuthUserLike = {
  id: string
  role?: string | null
} & Record<string, unknown>

async function listAllowedCourseNames(authUser: AuthUserLike, courseConfigSetName: string) {
  const rows: Array<{ course: string | null; _count: { course: number } }> =
    await prisma.registration.groupBy({
      by: ['course'],
      where: { courseConfigSetName },
      _count: { course: true },
    });

  const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
  const { accessMap, indexMap } = await loadAccessContext(
    authUser.id,
    [courseConfigSetName],
    bypassCategoryAccess
  );

  return rows
    .filter((row: { course: string | null }) =>
      isCourseNameAllowed(
        row.course || '',
        courseConfigSetName,
        accessMap,
        indexMap,
        bypassCategoryAccess
      )
    )
    .map((row: { course: string | null; _count: { course: number } }) => ({
      course: row.course || '',
      count: Number(row._count?.course || 0),
    }))
    .sort((a: { course: string }, b: { course: string }) =>
      a.course.localeCompare(b.course, 'ko-KR')
    );
}

function normalizeCourseNameChanges(changes: unknown[]) {
  const changeMap = new Map<string, string>();
  for (const change of changes) {
    const from = String((change as { from?: unknown })?.from || '').trim();
    const to = String((change as { to?: unknown })?.to || '').trim();
    if (!from || !to || from === to) continue;
    changeMap.set(from, to);
  }
  return Array.from(changeMap.entries()).map(([from, to]) => ({ from, to }));
}

async function findForbiddenCourseName(
  authUser: AuthUserLike,
  courseConfigSetName: string,
  courseNames: string[]
) {
  const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
  const { accessMap, indexMap } = await loadAccessContext(
    authUser.id,
    [courseConfigSetName],
    bypassCategoryAccess
  );

  return courseNames.find(
    (course) =>
      !isCourseNameAllowed(
        course,
        courseConfigSetName,
        accessMap,
        indexMap,
        bypassCategoryAccess
      )
  );
}

function applyCourseRenameToData(
  data: Record<string, unknown>,
  changeMap: Map<string, string>
) {
  let changed = false;

  // courseTree: update item labels
  const courseTree = data.courseTree;
  if (Array.isArray(courseTree)) {
    for (const group of courseTree) {
      if (!Array.isArray(group?.items)) continue;
      for (const item of group.items) {
        const newLabel = changeMap.get(item?.label);
        if (newLabel) {
          item.label = newLabel;
          changed = true;
        }
      }
    }
  }

  // timeTable: rename keys
  const timeTable = data.timeTable;
  if (timeTable && typeof timeTable === 'object') {
    for (const [from, to] of changeMap) {
      if ((timeTable as Record<string, unknown>)[from] !== undefined) {
        (timeTable as Record<string, unknown>)[to] = (timeTable as Record<string, unknown>)[from];
        delete (timeTable as Record<string, unknown>)[from];
        changed = true;
      }
    }
  }

  return changed;
}

async function renameCourseNames(
  courseConfigSetName: string,
  normalizedChanges: Array<{ from: string; to: string }>
) {
  const fromList = normalizedChanges.map((item) => item.from);
  const counts: Array<{ course: string | null; _count: { course: number } }> =
    await prisma.registration.groupBy({
      by: ['course'],
      where: { courseConfigSetName, course: { in: fromList } },
      _count: { course: true },
    });

  const caseItems = normalizedChanges.map((item) =>
    Prisma.sql`WHEN ${item.from} THEN ${item.to}`
  );
  const inItems = normalizedChanges.map((item) => Prisma.sql`${item.from}`);

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "registrations"
      SET "course" = CASE "course"
        ${Prisma.join(caseItems, Prisma.sql` `)}
        ELSE "course"
      END
      WHERE "courseConfigSetName" = ${courseConfigSetName}
        AND "course" IN (${Prisma.join(inItems)});
    `
  );

  // CourseConfigSet + CourseConfig의 courseTree/timeTable도 동기화
  const changeMap = new Map(normalizedChanges.map((c) => [c.from, c.to]));

  const configSet = await prisma.courseConfigSet.findUnique({
    where: { name: courseConfigSetName },
  });
  if (configSet?.data && typeof configSet.data === 'object') {
    const setData = JSON.parse(JSON.stringify(configSet.data));
    if (applyCourseRenameToData(setData, changeMap)) {
      await prisma.courseConfigSet.update({
        where: { name: courseConfigSetName },
        data: { data: setData },
      });
    }
  }

  const courseConfig = await prisma.courseConfig.findUnique({
    where: { key: 'courses' },
  });
  if (courseConfig?.data && typeof courseConfig.data === 'object') {
    const cfgData = JSON.parse(JSON.stringify(courseConfig.data));
    if (cfgData.courseConfigSetName === courseConfigSetName) {
      if (applyCourseRenameToData(cfgData, changeMap)) {
        await prisma.courseConfig.update({
          where: { key: 'courses' },
          data: { data: cfgData },
        });
      }
    }
  }

  const details = normalizedChanges.map((item) => {
    const match = counts.find((row) => row.course === item.from);
    return {
      from: item.from,
      to: item.to,
      updated: Number(match?._count?.course || 0),
    };
  });
  const updated = details.reduce((sum, item) => sum + item.updated, 0);

  return { updated, details };
}

module.exports = {
  findForbiddenCourseName,
  listAllowedCourseNames,
  normalizeCourseNameChanges,
  renameCourseNames,
};
