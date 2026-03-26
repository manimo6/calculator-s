# Backend

This backend uses PostgreSQL via Prisma. Runtime storage is no longer based on
Google Sheets or `backend/data/*.json`.

## Prerequisites

- Node.js 22.x
- PostgreSQL
- A `.env` file created from `.env.example`

## Local development

From the repo root, start the local database:

```bash
docker compose up -d db
```

The local PostgreSQL port is `15432` as defined in `docker-compose.yml`.

## Environment variables

From `calculator/backend`:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `AUTH_SECRET`

Common optional values:

- `PORT` (default `3000`)
- `CORS_ORIGIN`

## Install and build

```bash
npm install
npm run prisma:migrate:deploy
npm run build
```

## Optional data import

Import legacy JSON data:

```bash
npm run db:seed:json
```

Import Google Sheets data:

```bash
npm run db:import:sheets
```

## Run the server

```bash
npm start
```

The backend listens on port `3000` by default.

## Production notes

- The current deployment model is EC2 + PM2 + PostgreSQL.
- If PostgreSQL is self-hosted on the same EC2 instance, use a local
  `DATABASE_URL` such as `postgresql://USER:PASSWORD@127.0.0.1:5432/DB?schema=public`.
- If you use a managed PostgreSQL service, add `sslmode=require` when needed.
- Use `ecosystem.config.cjs` when starting the production process with PM2.

## Reset strategy for development

To reset the local database completely:

```bash
npx prisma migrate reset
```

This is destructive and should only be used in development.
