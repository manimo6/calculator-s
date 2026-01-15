-- AlterTable
ALTER TABLE "registrations" ADD COLUMN "courseConfigSetName" TEXT;

-- CreateIndex
CREATE INDEX "registrations_courseConfigSetName_idx" ON "registrations"("courseConfigSetName");

-- CreateIndex
CREATE INDEX "registrations_courseConfigSetName_name_course_idx" ON "registrations"("courseConfigSetName", "name", "course");

