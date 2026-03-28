-- AlterTable
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "durationUnit" TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "selectedDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
