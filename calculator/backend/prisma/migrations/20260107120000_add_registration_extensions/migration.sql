CREATE TABLE "registration_extensions" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "startDate" DATE,
    "weeks" INTEGER NOT NULL,
    "tuitionFee" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "registration_extensions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registration_extensions_registrationId_idx" ON "registration_extensions"("registrationId");
CREATE INDEX "registration_extensions_startDate_idx" ON "registration_extensions"("startDate");

ALTER TABLE "registration_extensions" ADD CONSTRAINT "registration_extensions_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
