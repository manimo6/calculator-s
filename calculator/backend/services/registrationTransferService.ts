const { prisma } = require('../db/prisma');
const { parseDateOnly, formatDateOnly } = require('../utils/dateUtils');
const {
  isRegistrationAccessAllowed,
  loadTransferAccessState,
} = require('./registrationAccessService');
const {
  cancelTransferredRegistration,
  createTransferredRegistration,
  loadTransferCancellationContext,
} = require('./registrationTransferDataService');

type AuthUserLike = {
  id: string
  role?: string | null
} & Record<string, unknown>

type RegistrationMutationRow = {
  id: string
  startDate?: string | Date | null
  withdrawnAt?: Date | string | null
  transferToId?: string | null
  transferFromId?: string | null
  courseConfigSetName?: string | null
} & Record<string, unknown>

const TRANSFER_MESSAGES = {
  registrationNotFound: '\uD574\uB2F9 ID\uC758 \uB4F1\uB85D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  alreadyTransferred: '\uC774\uBBF8 \uC804\uBC18 \uCC98\uB9AC\uB41C \uB4F1\uB85D\uC785\uB2C8\uB2E4.',
  withdrawnRegistration: '\uC911\uB3C4\uC774\uD0C8\uD55C \uB4F1\uB85D\uC740 \uC804\uBC18\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  invalidTransferDate: '\uC804\uBC18 \uB0A0\uC9DC\uB294 \uC2DC\uC791\uC77C \uC774\uD6C4\uC5EC\uC57C \uD569\uB2C8\uB2E4.',
  missingCourseConfigSet: '\uACFC\uBAA9 \uC124\uC815\uC14B \uC774\uB984\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  targetCourseMissingInSet: '\uACFC\uBAA9 \uC124\uC815\uC14B\uC5D0 \uC804\uBC18 \uB300\uC0C1 \uACFC\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  transferHistoryMissing: '\uC804\uBC18 \uC774\uB825\uC774 \uC5C6\uB294 \uB4F1\uB85D\uC785\uB2C8\uB2E4.',
  transferRecordMissing: '\uC804\uBC18 \uB4F1\uB85D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  chainedTransfer: '\uC774\uBBF8 \uB2E4\uC74C \uC804\uBC18\uC73C\uB85C \uC5F0\uACB0\uB41C \uB4F1\uB85D\uC785\uB2C8\uB2E4.',
  withdrawnTransfer: '\uC911\uB3C4\uC774\uD0C8\uD55C \uC804\uBC18 \uB4F1\uB85D\uC740 \uCDE8\uC18C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
} as const;

function fail(statusCode: number, message: string) {
  return {
    statusCode,
    body: { status: 'fail', message },
  };
}

async function createTransferRouteResult({
  authUser,
  id,
  transferAt,
  courseName,
  courseId,
  courseConfigSetName,
  nextWeeks,
}: {
  authUser: AuthUserLike
  id: string
  transferAt: Date
  courseName: string
  courseId?: string
  courseConfigSetName?: string
  nextWeeks?: number | null
}) {
  const existing: RegistrationMutationRow | null = await prisma.registration.findUnique({
    where: { id },
  });
  if (!existing) {
    return fail(404, TRANSFER_MESSAGES.registrationNotFound);
  }

  if (existing.transferToId) {
    return fail(400, TRANSFER_MESSAGES.alreadyTransferred);
  }

  if (existing.withdrawnAt) {
    return fail(400, TRANSFER_MESSAGES.withdrawnRegistration);
  }

  const startDate = parseDateOnly(existing.startDate);
  if (startDate && transferAt.getTime() <= startDate.getTime()) {
    return fail(400, TRANSFER_MESSAGES.invalidTransferDate);
  }

  const transferAccess = await loadTransferAccessState({
    authUser,
    existing,
    requestedCourseConfigSetName: courseConfigSetName,
    course: { courseId, courseName },
  });
  const effectiveSetName = transferAccess.effectiveSetName;

  if (!effectiveSetName) {
    return fail(400, TRANSFER_MESSAGES.missingCourseConfigSet);
  }

  if (!transferAccess.targetInSet) {
    return fail(400, TRANSFER_MESSAGES.targetCourseMissingInSet);
  }

  if (!transferAccess.sourceAllowed || !transferAccess.targetAllowed) {
    return fail(403, 'Permission denied.');
  }

  const created = await createTransferredRegistration({
    existing,
    transferAt,
    courseName,
    courseId,
    courseConfigSetName: effectiveSetName || undefined,
    nextWeeks,
  });

  return {
    statusCode: 200,
    body: {
      status: 'success',
      record: {
        id: created.id,
        course: created.course || '',
        startDate: formatDateOnly(created.startDate),
        transferFromId: created.transferFromId || '',
      },
    },
  };
}

async function cancelTransferRouteResult({
  authUser,
  id,
}: {
  authUser: AuthUserLike
  id: string
}) {
  const cancellationContext = await loadTransferCancellationContext(id);
  const existing = cancellationContext.existing;
  if (!existing) {
    return fail(404, TRANSFER_MESSAGES.registrationNotFound);
  }

  let original = null;
  let transfer = null;

  if (existing.transferFromId) {
    transfer = existing;
    original = cancellationContext.original;
  } else if (existing.transferToId) {
    original = existing;
    transfer = cancellationContext.transfer;
  } else {
    return fail(400, TRANSFER_MESSAGES.transferHistoryMissing);
  }

  if (!original || !transfer) {
    return fail(404, TRANSFER_MESSAGES.transferRecordMissing);
  }

  if (transfer.transferToId) {
    return fail(400, TRANSFER_MESSAGES.chainedTransfer);
  }

  if (transfer.withdrawnAt) {
    return fail(400, TRANSFER_MESSAGES.withdrawnTransfer);
  }

  const canAccess = await isRegistrationAccessAllowed(authUser, [original, transfer]);
  if (!canAccess) {
    return fail(403, 'Permission denied.');
  }

  const restoredEndDate = await cancelTransferredRegistration({
    original,
    transfer,
  });

  return {
    statusCode: 200,
    body: {
      status: 'success',
      record: {
        id: original.id,
        endDate: formatDateOnly(restoredEndDate),
      },
    },
  };
}

module.exports = {
  cancelTransferRouteResult,
  createTransferRouteResult,
};
