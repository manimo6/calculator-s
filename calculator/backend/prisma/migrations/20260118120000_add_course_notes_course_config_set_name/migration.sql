-- AlterTable
ALTER TABLE "course_notes" ADD COLUMN "courseConfigSetName" TEXT;

-- Remove existing notes to avoid invalid config set mapping
DELETE FROM "course_notes";

-- AlterTable
ALTER TABLE "course_notes"
ALTER COLUMN "courseConfigSetName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "course_notes_courseConfigSetName_idx" ON "course_notes"("courseConfigSetName");
