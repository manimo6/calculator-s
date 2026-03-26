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
