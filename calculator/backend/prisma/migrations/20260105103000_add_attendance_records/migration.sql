CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_records_registrationId_date_key" ON "attendance_records"("registrationId", "date");
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");
CREATE INDEX "attendance_records_registrationId_idx" ON "attendance_records"("registrationId");

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
