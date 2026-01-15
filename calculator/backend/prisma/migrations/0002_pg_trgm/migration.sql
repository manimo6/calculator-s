-- Enable extension for fast substring search (ILIKE / %term%)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimize GET /api/students?searchTerm=... (name substring search)
CREATE INDEX IF NOT EXISTS "registrations_name_trgm_idx"
ON "registrations" USING GIN ("name" gin_trgm_ops);

