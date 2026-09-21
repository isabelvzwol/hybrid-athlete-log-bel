## Hybrid Athlete Log

Trainingslogboek voor hybrid athlete training (hardlopen, Hyrox, kracht, duursport). Deze versie is de ombouw van het oorspronkelijke één-bestand-prototype (`hybrid-athlete-app.html`, React zonder build-stap, data in localStorage) naar een normaal Vite + React project met Supabase (Postgres + Auth) als opslag, klaar om op Vercel te draaien.

Dezelfde schermen, dezelfde functionaliteit en dezelfde "Muted Premium Dark Mode" styling als het origineel zijn 1-op-1 overgenomen. Alleen de opslaglaag is vervangen: van localStorage naar Supabase, met een login ervoor.

### Wat je nodig hebt

- Node.js 18 of hoger
- Een Supabase-project (je hebt er al één: `iwvtwbyfudaefecwiwta.supabase.co`)
- Een GitHub-account en een Vercel-account voor de deploy

### Stap 1: database aanmaken in Supabase

1. Ga naar je Supabase-project, open SQL Editor, klik op New query.
2. Plak de volledige inhoud van `supabase/schema.sql` en klik op Run.
   Dit maakt alle tabellen aan, zet Row Level Security aan en voegt de juiste policies toe (iedereen ziet alleen zijn eigen data).

### Stap 2: jouw account aanmaken

Dit is een single-user app, dus er is bewust geen registratieformulier.

1. Ga naar Authentication > Users in het Supabase Dashboard.
2. Klik op Add user, vul je e-mailadres en een wachtwoord in, en zet "Auto Confirm User" aan.
3. Met dat e-mailadres en wachtwoord log je straks in op de app.

### Stap 3: lokaal draaien

```
npm install
npm run dev
```

De Supabase-projectgegevens staan al klaar in `.env.local` (die van jou, dus niet inchecken in git, dat gebeurt ook niet want dit bestand staat in `.gitignore`). Wil je met een ander Supabase-project werken, pas dan `.env.local` aan naar het voorbeeld in `.env.example`.

### Stap 4: je bestaande data overzetten

Als je op je telefoon of laptop nog data in de oude, localStorage-versie van de app hebt staan:

1. Open de oude app (het HTML-bestand) en ga naar het tandwiel-icoon rechtsboven, dan Backup downloaden (JSON).
2. Log in op de nieuwe app en ga ook daar naar het tandwiel-icoon, dan Backup importeren, en kies het zojuist gedownloade bestand.

Let op: importeren vervangt de bestaande data in Supabase voor de onderdelen die in het bestand staan (races, schema, kracht, Hyrox, PR's, duursport-logs, stemming, klachten en de triatlon-checklist).

### Stap 5: naar GitHub en Vercel

Deze cloud-omgeving heeft geen toegang tot jouw GitHub- of Vercel-account, dus dit deel doe je zelf, het duurt een paar minuten:

1. Maak een nieuwe, lege GitHub-repository aan (zonder README, .gitignore of licentie, die heeft dit project al).
2. Voer in de projectmap uit:
   ```
   git remote add origin <url-van-je-nieuwe-repo>
   git push -u origin main
   ```
   (Er staat al een eerste commit klaar, zie hieronder.)
3. Ga naar vercel.com, klik op Add New > Project, en kies de zojuist gepushte GitHub-repository. Vercel herkent het Vite-project automatisch.
4. Zet bij Environment Variables in Vercel dezelfde twee variabelen als in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Klik op Deploy. Vanaf nu deployt Vercel automatisch bij elke push naar GitHub.

Test daarna op je telefoon en je laptop met hetzelfde account, dan zie je dat de data synchroniseert.

### Projectstructuur

```
src/
  lib/            datamodel, hulpfuncties en de Supabase-datalaag (db.js)
  components/     gedeelde UI-onderdelen (kaarten, modals, trainingslog, kracht, hyrox-blokken)
  screens/        de zes tabs: Home, Schema, Kracht, Hyrox, Duursport, PR's
  Auth.jsx        inlogscherm en sessiebeheer
  App.jsx         schermwissel, navigatie en alle datamutaties
supabase/
  schema.sql      volledig databaseschema met Row Level Security
```

De React-componenten gebruiken bewust `React.createElement` (net als het origineel) in plaats van JSX-syntax, zodat de logica 1-op-1 overgenomen kon worden zonder overzet-fouten. Wil je op termijn naar JSX, dan kan dat per bestand, zonder dat de rest van de app hoeft te veranderen.

### Bewuste aanpassingen ten opzichte van het origineel

- Backup importeren herstelde in de oude versie per ongeluk je stemming-log, klachten-log en triatlon-checklist niet (die drie velden ontbraken in de import-functie, terwijl ze wel in de export zaten). Dat is hier gecorrigeerd: die drie worden nu ook meegenomen bij een import.
- De `claude.use('downloads')`-integratie uit het origineel (voor gebruik binnen een Claude-artifact) is vervangen door een gewone browser-download, aangezien de app nu als zelfstandige site draait.
- Er is geen offline-ondersteuning: voor elke wijziging is een internetverbinding naar Supabase nodig. Lukt een wijziging niet (bijvoorbeeld door een wegvallende verbinding), dan verschijnt bovenin een waarschuwingsbalk.
