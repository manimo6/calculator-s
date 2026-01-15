# Backend (PostgreSQL Migration)

This backend no longer uses Google Sheets or `backend/data/*.json` for runtime storage. It uses PostgreSQL via Prisma.

## Prerequisites

- Node.js (repo currently uses Node 22.x)
- PostgreSQL (local via Docker Compose or a managed DB like AWS RDS)

## 1) Local development DB (Docker)

From repo root:

```bash
docker compose up -d db
```

Local DB port is `5433` (see `docker-compose.yml`).

## 2) Environment variables

Copy and edit:

```bash
cd backend
cp .env.example .env
```

Required:
- `DATABASE_URL`

Optional:
- `AUTH_SECRET`, `PORT`, `CORS_ORIGIN`

Google Sheets import only (not needed for normal server run):
- `SPREADSHEET_ID`, `SHEET_NAME`, `CREDENTIALS_FILE`

### Production (AWS RDS) SSL note

Use `sslmode=require` in `DATABASE_URL` (example in `.env.example`).
If SSL handshake fails due to CA verification, Prisma docs suggest `sslmode=no-verify`.

## 3) Install dependencies

```bash
cd backend
npm install
```

## 4) Run migrations

```bash
cd backend
npm run prisma:migrate:deploy
```

This applies SQL migrations in `backend/prisma/migrations` (includes `pg_trgm` for fast name substring search).

## 5) One-time data import

### (A) JSON files → DB

Imports `backend/data/*.json` into PostgreSQL (non-destructive / safe to re-run: uses `skipDuplicates`):

```bash
cd backend
npm run db:seed:json
```

### (B) Google Sheets → DB (students/registrations)

Imports Google Sheets rows (1 row = 1 registration) into PostgreSQL (safe to re-run via `importHash` uniqueness):

```bash
cd backend
npm run db:import:sheets
```

## 6) Start server

```bash
cd backend
npm start
```

## Reset / Re-run strategy (dev)

- If you need a clean DB: `npx prisma migrate reset` (drops and recreates schema; **destructive**).
- Otherwise, the provided import scripts are designed to be re-runnable without duplicating data.

