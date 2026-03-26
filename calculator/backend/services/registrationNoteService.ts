const { prisma } = require('../db/prisma');

type RegistrationMutationRow = {
  id: string
  transferFromId?: string | null
} & Record<string, unknown>

type RegistrationNoteRootContext = {
  existing: RegistrationMutationRow | null
  root: RegistrationMutationRow | null
  rootId: string
}

async function loadRegistrationNoteRootContext(id: string): Promise<RegistrationNoteRootContext> {
  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    return { existing: null, root: null, rootId: '' };
  }

  const rootId = String(existing.transferFromId || existing.id || '');
  const root = existing.transferFromId
    ? await prisma.registration.findUnique({ where: { id: rootId } })
    : existing;

  return { existing, root, rootId };
}

async function saveRegistrationNote({
  rootId,
  content,
}: {
  rootId: string
  content: string
}) {
  if (!content) {
    await prisma.registrationNote.deleteMany({ where: { registrationId: rootId } });
    return null;
  }

  return prisma.registrationNote.upsert({
    where: { registrationId: rootId },
    update: { content },
    create: { registrationId: rootId, content },
  });
}

module.exports = {
  loadRegistrationNoteRootContext,
  saveRegistrationNote,
};
