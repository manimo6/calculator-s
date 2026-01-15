-- AlterTable
ALTER TABLE "registrations" ADD COLUMN "skipWeeks" INTEGER[] NOT NULL DEFAULT '{}';
