-- CreateTable
CREATE TABLE "registration_notes" (
    "registrationId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "registration_notes_pkey" PRIMARY KEY ("registrationId")
);

-- AddForeignKey
ALTER TABLE "registration_notes" ADD CONSTRAINT "registration_notes_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
