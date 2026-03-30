const { prisma } = require('../db/prisma');
const { formatDateOnly } = require('../utils/dateUtils');
const { computeEndDate } = require('../utils/parsers');
const { loadAccessibleRegistrations } = require('./registrationAccessService');

type RegistrationMutationRow = {
  id: string
  name?: string | null
  startDate?: string | Date | null
  weeks?: number | null
  skipWeeks?: unknown[] | null
  tuitionFee?: number | null
  excludeMath?: boolean | null
} & Record<string, unknown>

type RegistrationListRow = RegistrationMutationRow & {
  course?: string | null
  courseId?: string | null
  courseConfigSetName?: string | null
  endDate?: Date | string | null
  timestamp?: Date | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  transferAt?: Date | string | null
  recordingDates?: unknown[] | null
  selectedDates?: unknown[] | null
  durationUnit?: string | null
}

type RegistrationNoteMap = Map<string, { content: string; updatedAt: Date }>
type AuthUserLike = {
  id: string
  role?: string | null
} & Record<string, unknown>

async function loadRegistrationNoteMap(rootIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set((rootIds || []).filter(Boolean).map((id) => String(id))));
  if (!ids.length) {
    return new Map<string, { content: string; updatedAt: Date }>();
  }

  const noteRows: Array<{ registrationId: string; content: string; updatedAt: Date }> =
    await prisma.registrationNote.findMany({
      where: { registrationId: { in: ids } },
      select: { registrationId: true, content: true, updatedAt: true },
    });

  return new Map<string, { content: string; updatedAt: Date }>(
    noteRows.map((note) => [note.registrationId, note])
  );
}

function formatRegistrationResults(
  rows: RegistrationListRow[],
  noteMap: RegistrationNoteMap
) {
  return rows.map((row: RegistrationListRow) => {
    const weeks = row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '';
    const startDate = formatDateOnly(row.startDate);
    const endDate = row.endDate
      ? formatDateOnly(row.endDate)
      : computeEndDate(row.startDate, row.weeks, row.skipWeeks);
    const rootId = row.transferFromId || row.id || '';
    const note = noteMap.get(String(rootId));

    return {
      id: row.id || '',
      timestamp: row.timestamp ? row.timestamp.toISOString() : '',
      name: row.name || '',
      course: row.course || '',
      courseId: row.courseId || '',
      courseConfigSetName: row.courseConfigSetName || '',
      startDate,
      endDate,
      withdrawnAt: formatDateOnly(row.withdrawnAt),
      transferFromId: row.transferFromId || '',
      transferToId: row.transferToId || '',
      transferAt: formatDateOnly(row.transferAt as string | number | Date | null | undefined),
      note: note ? note.content : '',
      noteUpdatedAt: note && note.updatedAt ? note.updatedAt.toISOString() : '',
      weeks,
      tuitionFee: row.tuitionFee ?? null,
      discount: (row as any).discount ?? 0,
      excludeMath: !!row.excludeMath,
      recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
      skipWeeks: Array.isArray(row.skipWeeks)
        ? row.skipWeeks.filter((w: unknown) => Number.isInteger(w))
        : [],
      selectedDates: Array.isArray(row.selectedDates) ? row.selectedDates.filter(Boolean) : [],
      durationUnit: row.durationUnit || 'weekly',
    };
  });
}

async function loadActiveMergeSummaries() {
  const mergeRows = await prisma.mergeGroup.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      courses: true,
      weekRanges: true,
      isActive: true,
      courseConfigSetName: true,
    },
    orderBy: { id: 'asc' },
  });

  const mergeCourses = new Set<string>();
  for (const mergeRow of mergeRows) {
    for (const course of mergeRow.courses) {
      mergeCourses.add(course);
    }
  }

  const mergeRefDateMap = new Map<string, string | null>();
  if (mergeCourses.size > 0) {
    const refRows: Array<{ course: string; minStart: Date | null }> =
      await prisma.$queryRawUnsafe(
        `SELECT course, MIN("startDate") as "minStart"
         FROM registrations
         WHERE course = ANY($1) AND "withdrawnAt" IS NULL
         GROUP BY course`,
        Array.from(mergeCourses)
      );

    for (const row of refRows) {
      mergeRefDateMap.set(
        row.course,
        row.minStart ? row.minStart.toISOString().slice(0, 10) : null
      );
    }
  }

  return mergeRows.map((mergeRow) => {
    let earliest: string | null = null;
    for (const course of mergeRow.courses) {
      const date = mergeRefDateMap.get(course);
      if (date && (!earliest || date < earliest)) earliest = date;
    }

    return {
      ...mergeRow,
      referenceStartDate: earliest,
    };
  });
}

async function loadRegistrationListPayload(authUser: AuthUserLike) {
  const filteredRows: RegistrationListRow[] = await loadAccessibleRegistrations(authUser);
  const rootIds = Array.from(
    new Set(
      filteredRows
        .map((row: RegistrationListRow) => row.transferFromId || row.id)
        .filter(Boolean)
    )
  );
  const noteMap = await loadRegistrationNoteMap(rootIds);
  const results = formatRegistrationResults(filteredRows, noteMap);
  const activeMerges = await loadActiveMergeSummaries();

  return { results, activeMerges };
}

module.exports = {
  formatRegistrationResults,
  loadActiveMergeSummaries,
  loadRegistrationListPayload,
  loadRegistrationNoteMap,
};
