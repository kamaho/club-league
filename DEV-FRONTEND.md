# dev-frontend – frontend-utvikling med demo-data

På branchen **dev-frontend** jobber du kun med frontend og tester med **mock data** (ingen backend må kjøre).

## 1. Bruk mock (ingen API)

For at appen skal bruke demo-data lokalt uten backend:

- **Fjern eller kommenter ut** `VITE_API_URL` i `.env.development`, **eller**
- Lag en fil `.env.development` i prosjektroten med kun:
  ```
  # La stå tom eller kommenter ut for kun frontend + mock:
  # VITE_API_URL=http://localhost:3000
  ```
- Start frontend: `npm run dev`

Da brukes data fra `services/db.ts` (mock) og du trenger ikke å kjøre backend.

## 2. Innlogging (mock – passord sjekkes ikke)

Logg inn med **e-post** (passord kan være hva som helst i mock-modus):

| E-post | Rolle | Beskrivelse |
|--------|--------|-------------|
| **test@test.no** | Spiller | Mye demo-kamper: foreslått (incoming/outgoing), planlagt, fullførte, vennskapskamper |
| **h0lst@icloud.com** | Spiller | Tilsvarende variasjon – kan teste «foreslå kamp» med test@test.no |
| **admin@club.com** | Admin | Tilgang til Admin-meny og divisjonsstyring |
| **bob@club.com** | Spiller | Incoming proposal fra Charlie, outgoing til Diana, m.m. |
| **diana@club.com** | Spiller | Kamper med Evan, Bob, Charlie |
| **evan@club.com** | Spiller | Kamper i Division A |

## 3. Flyt du kan teste (med test@test.no eller h0lst@icloud.com)

- **Hjem:** Oppsummering av kamper (action required, venter, planlagt, resultater).
- **Foreslå kamp:** Kamper med status PROPOSED – **incoming** (du må svare) og **outgoing** (du venter på svar).
- **Planlagte kamper:** SCHEDULED med dato/tid og logistikk.
- **Resultater:** CONFIRMED med sett-resultat (seier/tap), WALKOVER.
- **Vennskapskamper:** Friendlies – både fullførte og planlagte.
- **Kamper:** Fane «Mine» / «Alle», ulike statuser.
- **Tabell:** Standings for aktiv sesong og divisjon.
- **Profil:** Egen profil, innstillinger, statistikk (avhengig av UI).
- **Admin:** Logg inn som **admin@club.com** for å se Admin og divisjonssider.

## 4. Tilbakestille demo-data

Mock-data lagres i `localStorage`. For å starte helt på nytt med data fra koden:

1. Åpne utviklerverktøy (F12) → Application (Chrome) / Storage (Firefox).
2. Finn **Local Storage** for din app-url.
3. Slett nøkkelen **club_league_db** (og ev. **club_league_user_id** / **club_league_user** for å logge ut).
4. Last siden på nytt – da lastes MOCK_*-data fra `services/db.ts` inn igjen.

## 5. Oppsummering

- **Branch:** `dev-frontend`
- **Kjør:** `npm run dev` (uten at backend kjører, og uten `VITE_API_URL`).
- **Logg inn med:** f.eks. **test@test.no** eller **h0lst@icloud.com** for å se alle flyt.
