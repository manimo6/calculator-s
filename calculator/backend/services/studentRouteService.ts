const { v4: uuidv4 } = require('uuid');

const { prisma } = require('../db/prisma');
const { formatDateOnly, parseDateOnly, normalizeCourseId, normalizeCourseConfigSetName } = require('../utils/dateUtils');
const {
  parseWeeks,
  parseTuitionFee,
  parseSkipWeeks,
  normalizeRecordingDates,
  parseExcludeMath,
} = require('../utils/parsers');

type RegistrationRow = {
  id?: string
  name?: string
  course?: string
  courseId?: string
  courseConfigSetName?: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  transferAt?: Date | string | null
  weeks?: number | null
  tuitionFee?: number | null
  excludeMath?: boolean
  recordingDates?: unknown[]
  skipWeeks?: unknown[]
  timestamp?: Date | null
} & Record<string, unknown>

type StudentRecordInput = Record<string, unknown> & {
  name?: string
  course?: string
  courseId?: string
  courseConfigSetName?: string
  startDate?: unknown
  endDate?: unknown
  withdrawnAt?: unknown
  weeks?: unknown
  tuitionFee?: unknown
  skipWeeks?: unknown
  excludeMath?: unknown
  recordingDates?: unknown
}

function buildCourseIdentity(courseId: unknown, courseName: unknown) {
  const id = normalizeCourseId(courseId);
  if (id) return `id:${id}`;
  const name = String(courseName ?? '').trim();
  return name ? `name:${name}` : '';
}

function extractCourseLabelPrefixes(courseTreeValue: unknown): string[] {
  if (!Array.isArray(courseTreeValue)) return [];
  const out = new Set<string>();
  for (const group of courseTreeValue) {
    const items = Array.isArray(group?.items) ? group.items : [];
    for (const item of items) {
      const label = String(item?.label ?? '').trim();
      if (label) out.add(label);
    }
  }
  return Array.from(out);
}

async function loadLegacyCoursePrefixesForSet(courseConfigSetName: string) {
  if (!courseConfigSetName) return [];

  try {
    const currentCourseConfig = await prisma.courseConfig.findUnique({
      where: { key: 'courses' },
      select: { data: true },
    });
    const activeSetName = String(currentCourseConfig?.data?.courseConfigSetName || '').trim();
    if (activeSetName !== courseConfigSetName) return [];

    return extractCourseLabelPrefixes(currentCourseConfig?.data?.courseTree);
  } catch {
    return [];
  }
}

async function buildStudentWhereClause({
  searchTerm,
  courseConfigSetName,
}: {
  searchTerm: string
  courseConfigSetName: string
}) {
  const baseWhere: any = {
    ...(searchTerm ? { name: { contains: searchTerm, mode: 'insensitive' } } : {}),
  };

  if (!courseConfigSetName) {
    return baseWhere;
  }

  const legacyCoursePrefixes = await loadLegacyCoursePrefixesForSet(courseConfigSetName);
  const legacyCourseFilters = legacyCoursePrefixes.map((prefix: string) => ({
    course: { startsWith: prefix },
  }));

  return {
    ...baseWhere,
    OR: [
      { courseConfigSetName },
      ...(legacyCourseFilters.length
        ? [{ courseConfigSetName: null, OR: legacyCourseFilters }]
        : []),
    ],
  };
}

function formatStudentRecord(row: RegistrationRow) {
  return {
    id: row.id || '',
    timestamp: row.timestamp ? row.timestamp.toISOString() : '',
    name: row.name || '',
    course: row.course || '',
    courseId: row.courseId || '',
    courseConfigSetName: row.courseConfigSetName || '',
    startDate: formatDateOnly(row.startDate),
    endDate: formatDateOnly(row.endDate),
    withdrawnAt: formatDateOnly(row.withdrawnAt),
    transferFromId: row.transferFromId || '',
    transferToId: row.transferToId || '',
    transferAt: formatDateOnly(row.transferAt),
    weeks: row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '',
    tuitionFee: row.tuitionFee ?? null,
    excludeMath: !!row.excludeMath,
    recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
    skipWeeks: Array.isArray(row.skipWeeks)
      ? row.skipWeeks.filter((w: unknown) => Number.isInteger(w))
      : [],
  };
}

function formatStudentResults(rows: RegistrationRow[]) {
  return rows.map((row: RegistrationRow) => formatStudentRecord(row));
}

function buildExistingStudentMap(existingRows: RegistrationRow[]) {
  return new Map<string, RegistrationRow>(
    existingRows.map((row: RegistrationRow) => [
      `${row.courseConfigSetName || ''}||${row.name}||${buildCourseIdentity(row.courseId, row.course)}`,
      row,
    ])
  );
}

function findStudentDuplicates(
  newRecords: StudentRecordInput[],
  existingByKey: Map<string, RegistrationRow>
) {
  const duplicates: Array<Record<string, unknown>> = [];

  for (const newRecord of newRecords) {
    const configSetName = normalizeCourseConfigSetName(newRecord.courseConfigSetName) || '';
    const courseIdentity = buildCourseIdentity(newRecord.courseId, newRecord.course);
    const existing = existingByKey.get(
      `${configSetName}||${newRecord.name}||${courseIdentity}`
    );
    if (!existing) continue;

    duplicates.push({
      name: newRecord.name,
      course: newRecord.course,
      courseId: newRecord.courseId || '',
      courseConfigSetName: configSetName,
      id: existing.id,
    });
  }

  return duplicates;
}

function buildStudentCreateRows(newRecords: StudentRecordInput[], timestamp: Date) {
  const createdIds: string[] = [];

  const rowsToCreate = newRecords.map((record: StudentRecordInput) => {
    const id = uuidv4();
    createdIds.push(id);

    return {
      id,
      timestamp,
      name: record.name,
      course: record.course,
      courseId: normalizeCourseId(record.courseId),
      courseConfigSetName: normalizeCourseConfigSetName(record.courseConfigSetName),
      startDate: parseDateOnly(record.startDate),
      endDate: parseDateOnly(record.endDate),
      withdrawnAt: parseDateOnly(record.withdrawnAt),
      weeks: parseWeeks(record.weeks),
      tuitionFee: parseTuitionFee(record.tuitionFee),
      skipWeeks: parseSkipWeeks(record.skipWeeks),
      excludeMath: parseExcludeMath(record.excludeMath),
      recordingDates: normalizeRecordingDates(record.recordingDates),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  return { createdIds, rowsToCreate };
}

function buildStudentUpdateData(updateRecord: StudentRecordInput, timestamp: Date) {
  const hasCourseConfigSetName = Object.prototype.hasOwnProperty.call(
    updateRecord,
    'courseConfigSetName'
  );
  const hasSkipWeeks = Object.prototype.hasOwnProperty.call(updateRecord, 'skipWeeks');
  const hasExcludeMath = Object.prototype.hasOwnProperty.call(updateRecord, 'excludeMath');
  const hasCourseId = Object.prototype.hasOwnProperty.call(updateRecord, 'courseId');
  const hasTuitionFee = Object.prototype.hasOwnProperty.call(updateRecord, 'tuitionFee');
  const hasWithdrawnAt = Object.prototype.hasOwnProperty.call(updateRecord, 'withdrawnAt');

  return {
    timestamp,
    name: updateRecord.name,
    course: updateRecord.course,
    ...(hasCourseId ? { courseId: normalizeCourseId(updateRecord.courseId) } : {}),
    ...(hasCourseConfigSetName
      ? { courseConfigSetName: normalizeCourseConfigSetName(updateRecord.courseConfigSetName) }
      : {}),
    startDate: parseDateOnly(updateRecord.startDate),
    endDate: parseDateOnly(updateRecord.endDate),
    weeks: parseWeeks(updateRecord.weeks),
    ...(hasTuitionFee ? { tuitionFee: parseTuitionFee(updateRecord.tuitionFee) } : {}),
    ...(hasWithdrawnAt ? { withdrawnAt: parseDateOnly(updateRecord.withdrawnAt) } : {}),
    ...(hasSkipWeeks ? { skipWeeks: parseSkipWeeks(updateRecord.skipWeeks) } : {}),
    ...(hasExcludeMath ? { excludeMath: parseExcludeMath(updateRecord.excludeMath) } : {}),
    recordingDates: normalizeRecordingDates(updateRecord.recordingDates),
    updatedAt: timestamp,
  };
}

module.exports = {
  buildCourseIdentity,
  buildExistingStudentMap,
  buildStudentCreateRows,
  buildStudentUpdateData,
  buildStudentWhereClause,
  findStudentDuplicates,
  formatStudentRecord,
  formatStudentResults,
};
