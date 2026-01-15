-- Add transfer tracking fields to registrations
ALTER TABLE "registrations"
  ADD COLUMN "transferFromId" UUID,
  ADD COLUMN "transferToId" UUID,
  ADD COLUMN "transferAt" DATE;

CREATE INDEX "registrations_transferFromId_idx" ON "registrations"("transferFromId");
CREATE INDEX "registrations_transferToId_idx" ON "registrations"("transferToId");
