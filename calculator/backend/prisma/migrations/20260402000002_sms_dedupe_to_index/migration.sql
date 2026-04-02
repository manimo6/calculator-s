-- DropIndex (unique → regular index)
DROP INDEX IF EXISTS "sms_deposits_dedupeHash_key";
CREATE INDEX IF NOT EXISTS "sms_deposits_dedupeHash_idx" ON "sms_deposits"("dedupeHash");
