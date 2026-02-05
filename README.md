<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Club League

A React + Vite app for managing club tennis leagues: matches, standings, friendlies, and admin.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173).

## Build for production

```bash
npm run build
```

Output is in the `dist/` folder. Preview the production build locally:

```bash
npm run preview
```

## Deploy (live version)

The project is set up for one-click deploy on **Vercel** or **Netlify**. Client-side routing is handled so all routes serve the SPA correctly.

### Deploy with Vercel

1. Push your code to GitHub (see “Push to Git” below if needed).
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New** → **Project** and import the `club-league` repo.
4. Leave **Build Command** as `npm run build` and **Output Directory** as `dist` (from `vercel.json`).
5. Click **Deploy**. Your live URL will be something like `https://club-league-xxx.vercel.app`.

### Deploy with Netlify

1. Push your code to GitHub.
2. Go to [netlify.com](https://netlify.com) and sign in with GitHub.
3. **Add new site** → **Import an existing project** → choose the repo.
4. Netlify will use `netlify.toml`: build command `npm run build`, publish directory `dist`, and SPA redirects.
5. Click **Deploy site**. Your live URL will be like `https://your-site-name.netlify.app`.

### Push to Git (if you haven’t yet)

```bash
git init
git add .
git commit -m "Prepare for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/club-league.git
git push -u origin main
```

Then run through the Vercel or Netlify steps above using this repo.

## Mobile app (iOS / Android) med Capacitor

Prosjektet er satt opp med **Capacitor** slik at du kan bygge en native app for App Store og Google Play.

### Krav

- **iOS:** Mac med **Xcode** (fra App Store)
- **Android:** **Android Studio** (valgfritt)

### Bygg og åpne i Xcode (iOS)

1. Bygg webappen og synk til native prosjekt:
   ```bash
   npm run cap:sync
   ```
   (Dette kjører `build:cap` og `cap sync` – bruk dette hver gang du har endret web-kode.)

2. Åpne iOS-prosjektet i Xcode:
   ```bash
   npm run cap:ios
   ```
   eller åpne `ios/App/App.xcworkspace` i Xcode.

3. I Xcode: velg en simulator eller en tilkoblet iPhone, og trykk **Run** (▶).

4. For **App Store:** Konfigurer **Signing & Capabilities** med ditt Apple Developer-konto, arkivér (**Product → Archive**), og last opp via **Distribute App**.

### Android

1. `npm run cap:sync`
2. `npm run cap:android` (åpner Android Studio)
3. Bygg og kjør fra Android Studio, eller bygg en release-APK/AAB for Google Play.

### Scripts

| Script        | Beskrivelse                                      |
|---------------|--------------------------------------------------|
| `npm run build:cap` | Bygger webappen med base `./` for native app   |
| `npm run cap:sync`  | Bygger + kopierer til `ios` og `android`       |
| `npm run cap:ios`   | Åpner iOS-prosjektet i Xcode                   |
| `npm run cap:android` | Åpner Android-prosjektet i Android Studio   |

**Tips:** Etter endringer i React/Vite-koden må du kjøre `npm run cap:sync` på nytt før du kjører appen i simulator eller på enhet.

## Tech stack

- **React 18** + **TypeScript**
- **Vite 5**
- **React Router 6**
- **Tailwind CSS**
- **Recharts** (standings/charts)
- **date-fns** + **lucide-react**
- **Capacitor** (iOS + Android)

Data kan bruke backend-API (se `backend/`) eller mock + `localStorage`.
