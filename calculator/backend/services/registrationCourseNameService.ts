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
