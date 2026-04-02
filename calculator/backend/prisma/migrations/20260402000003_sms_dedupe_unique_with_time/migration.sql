-- Drop regular index, add unique constraint
DROP INDEX IF EXISTS "sms_deposits_dedupeHash_idx";
CREATE UNIQUE INDEX "sms_deposits_dedupeHash_key" ON "sms_deposits"("dedupeHash");
