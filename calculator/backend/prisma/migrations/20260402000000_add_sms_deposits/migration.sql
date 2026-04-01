-- CreateTable
CREATE TABLE "sms_deposits" (
    "id" UUID NOT NULL,
    "rawBody" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT '',
    "depositorName" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER,
    "registrationId" UUID,
    "dedupeHash" TEXT NOT NULL DEFAULT '',
    "matchStatus" TEXT NOT NULL DEFAULT 'unmatched',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sms_deposits_depositor" ON "sms_deposits"("depositorName");
CREATE INDEX "idx_sms_deposits_status" ON "sms_deposits"("matchStatus");
CREATE INDEX "idx_sms_deposits_received" ON "sms_deposits"("receivedAt");
CREATE INDEX "idx_sms_deposits_dedupe" ON "sms_deposits"("dedupeHash", "createdAt");
