ALTER TABLE "registrations" ADD COLUMN "courseId" TEXT;
CREATE INDEX "registrations_courseId_idx" ON "registrations"("courseId");