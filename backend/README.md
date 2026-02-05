# Club League API

Node + Express + TypeScript backend med Prisma (SQLite). Bruk dette sammen med frontend i `../` (Vite + React).

## Oppsett

```bash
cd backend
npm install
cp .env.example .env   # rediger JWT_SECRET i produksjon
npx prisma generate
npx prisma db push
npm run db:seed
```

## Kjøre lokalt

```bash
npm run dev
```

API: **http://localhost:3000**

## API-ruter

- **Auth:** `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` (Bearer token)
- **Users:** `GET/PATCH/DELETE /api/users`, `GET /api/users/:id`
- **Seasons:** `GET/POST/PATCH /api/seasons`
- **Divisions:** `GET /api/divisions?seasonId=`, `GET/POST /api/divisions`, `POST /api/divisions/:id/enroll`, `POST /api/divisions/:id/generate-matches`
- **Matches:** `GET /api/matches?divisionId=|userId=`, `GET/PATCH /api/matches/:id`, `POST /api/matches/submit-score`, `POST /api/matches/confirm-score`, `POST /api/matches/friendly`
- **Proposals:** `GET /api/proposals?matchId=`, `POST /api/proposals`
- **Enrollments:** `GET /api/enrollments?divisionId=|userId=`
- **Settings:** `GET/PATCH /api/settings`
- **Season status:** `GET /api/season-status`

## Demo-brukere (etter seed)

Kjør `npm run db:seed` for å fylle databasen. Alle brukere tilhører samme klubb (club-1) slik at du kan teste friendlies mellom dem.

| E-post           | Passord | Rolle  |
|------------------|---------|--------|
| admin@club.com   | demo123 | Admin  |
| bob@club.com     | demo123 | Spiller|
| charlie@club.com | demo123 | Spiller|
| diana@club.com   | demo123 | Spiller|
| evan@club.com    | demo123 | Spiller|

## Database

- **Lokalt:** SQLite i `prisma/dev.db`
- **Prisma Studio:** `npm run db:studio` for å åpne DB i nettleseren
