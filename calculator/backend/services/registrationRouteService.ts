const { prisma } = require('../db/prisma');
const { loadRegistrationListPayload } = require('./registrationListService');
const {
  findForbiddenCourseName,
  listAllowedCourseNames,
  normalizeCourseNameChanges,
  renameCourseNames,
} = require('./registrationCourseNameService');
const {
  isRegistrationAccessAllowed,
  isCourseNameAllowed,
  isCourseAllowed,
  isCourseInSet,
  loadAccessibleRegistrations,
  loadTransferAccessState,
} = require('./registrationAccessService');
const {
  loadRegistrationNoteRootContext,
  saveRegistrationNote,
} = require('./registrationNoteService');

async function loadRegistrationById(id: string) {
  return prisma.registration.findUnique({ where: { id } });
}

async function updateRegistrationWithdrawal({
  id,
  withdrawnAt,
}: {
  id: string
  withdrawnAt: Date | null
}) {
  return prisma.registration.update({
    where: { id },
    data: { withdrawnAt },
  });
}

module.exports = {
  findForbiddenCourseName,
  isRegistrationAccessAllowed,
  isCourseNameAllowed,
  isCourseAllowed,
  isCourseInSet,
  listAllowedCourseNames,
  loadAccessibleRegistrations,
  loadRegistrationById,
  loadRegistrationListPayload,
  loadRegistrationNoteRootContext,
  loadTransferAccessState,
  normalizeCourseNameChanges,
  renameCourseNames,
  saveRegistrationNote,
  updateRegistrationWithdrawal,
};
