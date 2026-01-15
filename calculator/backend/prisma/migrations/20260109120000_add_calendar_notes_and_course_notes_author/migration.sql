ALTER TABLE "course_notes" ADD COLUMN "author" TEXT NOT NULL DEFAULT '';

CREATE TABLE "calendar_notes" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "calendar_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_notes_date_idx" ON "calendar_notes"("date");
