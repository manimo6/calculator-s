const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { parseDateOnly } = require('../utils/dateUtils');
const { computeEndDate } = require('../utils/parsers');

type RegistrationMutationRow = {
  id: string
  name?: string | null
  startDate?: string | Date | null
  weeks?: number | null
  skipWeeks?: unknown[] | null
  tuitionFee?: number | null
  excludeMath?: boolean | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  courseConfigSetName?: string | null
  durationUnit?: string | null
  selectedDates?: string[] | null
} & Record<string, unknown>

type TransferCancellationContext = {
  existing: RegistrationMutationRow | null
  original: RegistrationMutationRow | null
  transfer: RegistrationMutationRow | null
}

function addDays(date: string | number | Date, days: number) {
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function isDailyRegistration(reg: RegistrationMutationRow) {
  return reg.durationUnit === 'daily'
    || (Array.isArray(reg.selectedDates) && reg.selectedDates.length > 0);
}

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function createTransferredRegistration({
  existing,
  transferAt,
  courseName,
  courseId,
  courseConfigSetName,
  nextWeeks,
}: {
  existing: RegistrationMutationRow
  transferAt: Date
  courseName: string
  courseId?: string
  courseConfigSetName?: string
  nextWeeks?: number | null
}) {
  const transferId = uuidv4();
  const now = new Date();
  if (isDailyRegistration(existing)) {
    const existingDates = Array.isArray(existing.selectedDates)
      ? [...existing.selectedDates].sort()
      : [];
    const transferYmd = formatYmd(transferAt);
    const newSelectedDates = existingDates.filter((d: string) => d >= transferYmd);
    if (!newSelectedDates.length) {
      throw new Error('전반할 수 있는 날짜가 없습니다.');
    }
    const oldSelectedDates = existingDates.filter((d: string) => d < transferYmd);

    const newStartDate = newSelectedDates.length > 0 ? new Date(newSelectedDates[0] + 'T00:00:00Z') : transferAt;
    const newEndDate = newSelectedDates.length > 0 ? new Date(newSelectedDates[newSelectedDates.length - 1] + 'T00:00:00Z') : null;
    const oldEndDate = oldSelectedDates.length > 0 ? new Date(oldSelectedDates[oldSelectedDates.length - 1] + 'T00:00:00Z') : addDays(transferAt, -1);

    return prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      const newRecord = await tx.registration.create({
        data: {
          id: transferId,
          timestamp: now,
          name: existing.name,
          course: courseName,
          courseId,
          courseConfigSetName: courseConfigSetName || undefined,
          startDate: newStartDate,
          endDate: newEndDate,
          withdrawnAt: null,
          weeks: nextWeeks != null ? Number(nextWeeks) : newSelectedDates.length,
          tuitionFee: existing.tuitionFee,
          skipWeeks: [],
          recordingDates: [],
          selectedDates: newSelectedDates,
          durationUnit: 'daily',
          excludeMath: !!existing.excludeMath,
          transferFromId: existing.id,
          transferAt,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.registration.update({
        where: { id: String(existing.id || '') },
        data: {
          endDate: oldEndDate,
          selectedDates: oldSelectedDates,
          transferToId: transferId,
          transferAt,
          updatedAt: now,
        },
      });

      return newRecord;
    });
  }

  const oldEndDate = addDays(transferAt, -1);
  const effectiveWeeks = Number(nextWeeks ?? existing.weeks) || 0;
  const newEndDate = effectiveWeeks > 0 ? addDays(transferAt, effectiveWeeks * 7 - 1) : null;

  return prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
    const newRecord = await tx.registration.create({
      data: {
        id: transferId,
        timestamp: now,
        name: existing.name,
        course: courseName,
        courseId,
        courseConfigSetName: courseConfigSetName || undefined,
        startDate: transferAt,
        endDate: newEndDate,
        withdrawnAt: null,
        weeks: effectiveWeeks || existing.weeks,
        tuitionFee: existing.tuitionFee,
        skipWeeks: [],
        recordingDates: [],
        excludeMath: !!existing.excludeMath,
        transferFromId: existing.id,
        transferAt,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.registration.update({
      where: { id: String(existing.id || '') },
      data: {
        endDate: oldEndDate,
        transferToId: transferId,
        transferAt,
        updatedAt: now,
      },
    });

    return newRecord;
  });
}

async function cancelTransferredRegistration({
  original,
  transfer,
}: {
  original: RegistrationMutationRow
  transfer: RegistrationMutationRow
}) {
  const now = new Date();
  if (isDailyRegistration(original)) {
    const origDates = Array.isArray(original.selectedDates) ? original.selectedDates : [];
    const transferDates = Array.isArray(transfer.selectedDates) ? transfer.selectedDates : [];
    const combined = [...new Set([...origDates, ...transferDates])].sort();
    const restoredEndDate = combined.length > 0
      ? parseDateOnly(combined[combined.length - 1])
      : parseDateOnly(computeEndDate(original.startDate, original.weeks, original.skipWeeks));

    await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      await tx.registration.delete({ where: { id: String(transfer.id || '') } });
      await tx.registration.update({
        where: { id: String(original.id || '') },
        data: {
          endDate: restoredEndDate,
          selectedDates: combined,
          transferToId: null,
          transferAt: null,
          updatedAt: now,
        },
      });
    });

    return restoredEndDate;
  }

  const restoredEndDate = parseDateOnly(
    computeEndDate(original.startDate, original.weeks, original.skipWeeks)
  );

  await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
    await tx.registration.delete({ where: { id: String(transfer.id || '') } });
    await tx.registration.update({
      where: { id: String(original.id || '') },
      data: {
        endDate: restoredEndDate,
        transferToId: null,
        transferAt: null,
        updatedAt: now,
      },
    });
  });

  return restoredEndDate;
}

async function loadTransferCancellationContext(id: string): Promise<TransferCancellationContext> {
  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    return { existing: null, original: null, transfer: null };
  }

  if (existing.transferFromId) {
    const original = await prisma.registration.findUnique({
      where: { id: existing.transferFromId },
    });
    return { existing, original, transfer: existing };
  }

  if (existing.transferToId) {
    const transfer = await prisma.registration.findUnique({
      where: { id: existing.transferToId },
    });
    return { existing, original: existing, transfer };
  }

  return { existing, original: null, transfer: null };
}

module.exports = {
  cancelTransferredRegistration,
  createTransferredRegistration,
  loadTransferCancellationContext,
};
