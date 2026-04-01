-- Drop old index and add unique constraint on dedupeHash
DROP INDEX IF EXISTS "idx_sms_deposits_dedupe";
CREATE UNIQUE INDEX "sms_deposits_dedupeHash_key" ON "sms_deposits"("dedupeHash");
