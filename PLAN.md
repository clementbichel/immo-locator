# Plan : Backend Production Readiness — `immo-locator-api`

> **Pour Claude Code :** ouvrir ce plan dans le repo `immo-locator-api` et exécuter task par task.

**Objectif :** Durcir le backend existant (sécurité, observabilité, robustesse) avant publication sur le Chrome Web Store.

**Prérequis :** Le backend Express fonctionne déjà sur `https://api.immolocator.fr` avec PM2 + Nginx + Let's Encrypt.

---

## Task 1 : Validation des env vars au démarrage ✅ DONE

**Fichier :** `src/index.js`

**Pourquoi :** Si une variable requise est manquante, le serveur démarre mais plante à la première requête. On veut un fail-fast au boot.

**Implémentation :**

Ajouter au tout début de `createApp()` (ou avant) :

```js
function validateEnv() {
  const required = ['ADEME_API_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

Appeler `validateEnv()` avant `createApp()` dans le bloc de démarrage.

**Test :** Vérifier que le serveur refuse de démarrer si `ADEME_API_URL` est absente.

```js
// tests/index.test.js
it('throws if ADEME_API_URL is missing', () => {
  delete process.env.ADEME_API_URL;
  expect(() => validateEnv()).toThrow('Missing required environment variables');
});
```

---

## Task 2 : Middleware d'erreur global ✅ DONE

**Fichier :** `src/index.js`

**Pourquoi :** Sans ça, une erreur non catchée dans une route renvoie un 500 HTML (pas JSON). Le client extension ne sait pas parser ça.

**Implémentation :**

Ajouter **après** toutes les routes, **avant** `app.listen()` :

```js
// Global error handler — must have 4 params for Express to recognize it
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Erreur interne du serveur.',
  });
});
```

**Test :**

```js
// tests/routes/error-handling.test.js
it('returns JSON 500 for unhandled route errors', async () => {
  // Ajouter temporairement une route qui throw
  // Vérifier que la réponse est du JSON avec error: 'INTERNAL_ERROR'
});
```

---

## Task 3 : Timeout sur les appels ADEME ✅ DONE

**Fichier :** `src/clients/ademe-client.js`

**Pourquoi :** Si l'API ADEME est lente ou down, la requête reste bloquée indéfiniment. L'utilisateur attend sans feedback.

**Implémentation :**

Modifier `fetchAdeme()` :

```js
export async function fetchAdeme(data) {
  const url = buildAdemeUrl(data);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000), // 10 secondes
  });
  if (!response.ok) {
    const err = new Error(`ADEME API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}
```

**Test :**

```js
// tests/clients/ademe-client.test.js
it('throws on timeout', async () => {
  // Mock un fetch qui ne répond jamais
  // Vérifier que fetchAdeme rejette avec une AbortError
});
```

**Note :** `AbortSignal.timeout()` est disponible nativement depuis Node 18.

---

## Task 4 : Validation d'entrée avec Zod ✅ DONE

**Fichiers :**
- `src/schemas/search.js` (nouveau)
- `src/routes/location.js` (modifier)

**Pourquoi :** Actuellement on vérifie juste la présence des champs. Un attaquant peut envoyer des types incorrects, des strings très longues, ou des champs inattendus.

**Installer Zod :**

```bash
npm install zod
```

**Implémentation :**

```js
// src/schemas/search.js
import { z } from 'zod';

export const searchSchema = z.object({
  zipcode: z.string().regex(/^\d{5}$/).nullish(),
  city: z.string().min(1).max(100).nullish(),
  dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  ges: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  surface: z.number().positive().max(10000),
  date_diag: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  conso_prim: z.number().positive().max(1000).nullish(),
  conso_fin: z.number().positive().max(1000).nullish(),
}).refine(
  data => data.zipcode || data.city,
  { message: 'zipcode ou city requis', path: ['zipcode'] }
);
```

Modifier `src/routes/location.js` :

```js
import { searchSchema } from '../schemas/search.js';

router.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join('.'));
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `Données invalides : ${parsed.error.issues.map(i => i.message).join(', ')}`,
      missing,
    });
  }

  const data = parsed.data;
  // ... suite inchangée avec validateSearchData pour le message FR
});
```

**Tests :**

```js
// tests/schemas/search.test.js
it('rejects invalid DPE letter', () => { ... });
it('rejects negative surface', () => { ... });
it('rejects zipcode with wrong format', () => { ... });
it('requires zipcode or city', () => { ... });
it('accepts valid payload', () => { ... });
```

---

## Task 5 : CORS — configurer les vrais origins

**Fichier :** `.env` sur le VPS

**Pourquoi :** Actuellement fallback `*` — n'importe quel site peut appeler l'API.

**Étapes :**

1. Dès que les extensions sont validées, mettre à jour le `.env` sur le VPS :
   ```
   CORS_CHROME_ORIGIN=chrome-extension://okglkdgbdbnikojffmjpodmakgjmlpda
   CORS_FIREFOX_ORIGIN=<id-firefox-après-validation-AMO>
   ```

2. Redémarrer avec PM2 :
   ```bash
   pm2 restart immo-locator-api
   ```

3. Tester : ouvrir l'extension → la recherche doit toujours fonctionner. Ouvrir un autre site → un `fetch` vers l'API doit être bloqué par CORS.

**Note :** L'ID Chrome est fixe : `okglkdgbdbnikojffmjpodmakgjmlpda`. L'ID Firefox sera disponible dans le dashboard AMO après validation.

---

## Task 6 : Logging structuré avec Pino

**Fichiers :**
- `src/logger.js` (nouveau)
- `src/index.js` (modifier)
- `src/routes/location.js` (modifier)
- `src/clients/ademe-client.js` (modifier)

**Installer Pino :**

```bash
npm install pino pino-http
```

**Implémentation :**

```js
// src/logger.js
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
```

```js
// src/index.js — ajouter le middleware HTTP logging
import pinoHttp from 'pino-http';
import { logger } from './logger.js';

app.use(pinoHttp({ logger }));
```

Remplacer tous les `console.log` / `console.error` par :

```js
import { logger } from '../logger.js';

// Dans location.js
logger.error({ err, zipcode: data.zipcode }, 'ADEME search failed');

// Dans le error handler global
logger.error({ err }, 'Unhandled error');
```

**Avantage :** Chaque requête HTTP est loggée automatiquement avec durée, status code, et un request ID unique.

**En dev :** Ajouter `pino-pretty` pour des logs lisibles :

```bash
npm install -D pino-pretty
```

```json
// package.json scripts
"dev": "node --watch src/index.js | npx pino-pretty"
```

---

## Task 7 : Monitoring avec UptimeRobot

**Prérequis :** Le endpoint `/health` existe déjà.

**Étapes :**

1. Créer un compte gratuit sur [uptimerobot.com](https://uptimerobot.com)
2. Ajouter un nouveau monitor :
   - Type : HTTP(s)
   - URL : `https://api.immolocator.fr/health`
   - Intervalle : 5 minutes
3. Configurer les alertes : email (et/ou Telegram/Slack si souhaité)

**Temps :** ~10 minutes, aucun code à écrire.

---

## Task 8b : Analytics — enregistrement des recherches en SQLite ✅ DONE

**Fichiers :** `src/db.js` (nouveau), `src/routes/location.js`, `deploy/deploy.sh`

Chaque appel à `/api/location/search` est enregistré dans `data/searches.db` avec : `ts`, `zipcode`, `city`, `dpe`, `ges`, `surface`, `date_diag`, `conso_prim`, `results_count`, `duration_ms`, `status`.

Permet d'analyser les recherches les plus fréquentes avant d'implémenter le cache LRU.

```bash
sqlite3 -column -header /opt/immo-locator-api/data/searches.db \
  'SELECT zipcode, dpe, COUNT(*) as hits FROM searches GROUP BY zipcode, dpe ORDER BY hits DESC;'
```

---

## Task 8 (nice to have) : Cache LRU des réponses ADEME ✅ DONE

**Fichier :** `src/clients/ademe-client.js`

**Pourquoi :** Éviter de re-appeler l'API ADEME pour les mêmes paramètres. Les données DPE changent rarement.

**Installer :**

```bash
npm install lru-cache
```

**Implémentation :**

```js
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 500,           // max 500 entrées
  ttl: 60 * 60 * 1000, // TTL 1 heure
});

export async function fetchAdeme(data) {
  const url = buildAdemeUrl(data);

  const cached = cache.get(url);
  if (cached) return cached;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const err = new Error(`ADEME API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const result = await response.json();
  cache.set(url, result);
  return result;
}
```

**Test :**

```js
it('returns cached response on second call with same params', async () => {
  // Mock fetch, appeler 2x, vérifier que fetch n'est appelé qu'une fois
});
```

---

## Task 9 (nice to have) : Mettre à jour le script de déploiement ✅ DONE

**Fichier :** `deploy.sh`

Remplacer toutes les occurrences de `vps-9f0f5451.vps.ovh.net` par `api.immolocator.fr`.

---

---

## Task 10 : Supprimer le `.env` du dépôt 🔴 CRITIQUE

**Fichier :** `.env` à la racine de `immo-locator-api`

**Pourquoi :** Le fichier `.env` est commité dans le repo. Même si les valeurs actuelles sont des placeholders, le pattern est dangereux — un vrai secret (clé API, mot de passe DB) pourrait être commité accidentellement.

**Étapes :**

1. Ajouter `.env` au `.gitignore` si ce n'est pas déjà fait :
   ```
   .env
   ```
2. Supprimer le fichier du tracking git sans le supprimer disque :
   ```bash
   git rm --cached .env
   git commit -m "chore: remove .env from version control"
   ```
3. Vérifier que `.env.example` est à jour avec toutes les variables requises (sans valeurs réelles).
4. Vérifier l'historique git pour s'assurer qu'aucun vrai secret n'a jamais été commité (`git log --all -p -- .env`).

---

## Task 11 : CORS fail-fast — supprimer le fallback wildcard 🔴 CRITIQUE

**Fichier :** `src/index.js`

**Pourquoi :** Si `CORS_CHROME_ORIGIN` et `CORS_FIREFOX_ORIGIN` ne sont pas définis, l'API accepte `*` (toutes origines). N'importe quel site web peut appeler l'API.

**Dépendance :** À coordonner avec Task 5 (configuration des vrais origins sur le VPS).

**Implémentation :**

Modifier la configuration CORS pour échouer au démarrage si aucun origin n'est configuré, plutôt que de tomber sur `*` :

```js
const allowedOrigins = [
  process.env.CORS_CHROME_ORIGIN,
  process.env.CORS_FIREFOX_ORIGIN,
].filter(Boolean).filter(o => o !== '*');

if (allowedOrigins.length === 0) {
  // Fail-fast : ne pas démarrer sans CORS configuré
  throw new Error('CORS_CHROME_ORIGIN ou CORS_FIREFOX_ORIGIN requis');
}

app.use(cors({ origin: allowedOrigins }));
```

Ajouter également `CORS_CHROME_ORIGIN` à la liste des variables requises dans `validateEnv()`.

**Test :**
```js
it('throws at startup if no CORS origin is configured', () => {
  delete process.env.CORS_CHROME_ORIGIN;
  delete process.env.CORS_FIREFOX_ORIGIN;
  expect(() => createApp()).toThrow('CORS_CHROME_ORIGIN');
});
```

---

## Task 12 : Renforcer la validation du schéma reports 🟠 HAUTE

**Fichier :** `src/routes/reports.js`

**Pourquoi :** Le schéma actuel utilise `.partial()`, ce qui rend tous les champs optionnels. Pas de limite de longueur, pas de validation de format pour DPE/GES, dates, surfaces. Une extension malveillante pourrait envoyer des strings arbitrairement longues.

**Implémentation :**

```js
const extractedSchema = z.object({
  surface:    z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  terrain:    z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  dpe:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  ges:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  date_diag:  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).nullish(),
  conso_prim: z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  conso_fin:  z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  city:       z.string().max(100).nullish(),
  zipcode:    z.string().regex(/^\d{5}$/).nullish(),
}).strict();
```

Supprimer `.partial()`, remplacer par `.nullish()` champ par champ.

**Test :**
```js
it('rejects DPE value outside A-G', () => { ... });
it('rejects surface with more than 10 chars', () => { ... });
it('rejects unknown fields (strict mode)', () => { ... });
```

---

## Task 13 : Rate limiting par endpoint 🟠 HAUTE

**Fichier :** `src/index.js`

**Pourquoi :** La limite globale de 30 req/min s'applique à tous les endpoints. L'endpoint `/api/location/search` effectue un appel ADEME externe coûteux — il devrait avoir une limite plus stricte pour éviter l'abus et l'énumération de codes postaux.

**Implémentation :**

```js
import rateLimit from 'express-rate-limit';

// Limite globale (inchangée)
app.use(rateLimit({ windowMs: 60_000, max: 30 }));

// Limite stricte sur la recherche
const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'RATE_LIMIT', message: 'Trop de recherches, réessayez dans une minute.' },
});
app.use('/api/location/search', searchLimiter);
```

**Test :**
```js
it('returns 429 after 10 search requests within a minute', async () => { ... });
```

---

## Ordre d'exécution recommandé

| Ordre | Task | Effort | Impact | Status |
|-------|------|--------|--------|--------|
| 1 | Task 1 — Validation env vars | 5 min | Fail-fast au deploy | ✅ Done |
| 2 | Task 2 — Error handler global | 10 min | Pas de 500 HTML | ✅ Done |
| 3 | Task 3 — Timeout ADEME | 5 min | Pas de requêtes bloquées | ✅ Done |
| 4 | Task 4 — Validation Zod | 30 min | Sécurité des entrées | ✅ Done |
| 5 | Task 5 — CORS vrais origins | 5 min | Restreindre l'accès | ⏳ En attente validation stores |
| 6 | Task 6 — Logging Pino | 30 min | Debugging en prod | ✅ Done |
| 7 | Task 7 — UptimeRobot | 10 min | Alertes si down | ✅ Done |
| 8b | Task 8b — Analytics SQLite | 30 min | Données de recherche | ✅ Done |
| 8 | Task 8 — Cache LRU | 20 min | Performance | ✅ Done |
| 9 | Task 9 — Deploy script | 5 min | Cleanup | ✅ Done |
| — | **Audit sécurité (ajouts)** | | | |
| 10 | Task 10 — Supprimer `.env` du repo | 5 min | 🔴 Critique — secrets | ⏳ À faire |
| 11 | Task 11 — CORS fail-fast (no wildcard) | 15 min | 🔴 Critique — accès API | ⏳ Après Task 5 |
| 12 | Task 12 — Schéma reports renforcé | 20 min | 🟠 Haute — validation données | ⏳ À faire |
| 13 | Task 13 — Rate limit par endpoint | 15 min | 🟠 Haute — anti-abus | ⏳ À faire |

**Total initial estimé : ~2h**
**Total avec audit sécurité : +~55 min**

---

## Checklist de validation finale

Après toutes les tasks, vérifier :

- [x] `npm test` passe à 100% (34/34)
- [x] Le serveur refuse de démarrer sans `ADEME_API_URL`
- [x] Une requête avec un body invalide renvoie une 400 JSON propre (code `MISSING_FIELDS` compatible extension)
- [x] Une requête quand l'API ADEME est down renvoie une 502 en < 11s
- [x] Les logs sont en JSON structuré (pas de `console.log`) — Task 6
- [ ] CORS bloque les requêtes depuis un origin non autorisé — Task 5 (en attente IDs stores)
- [x] UptimeRobot envoie une alerte test — Task 7
- [ ] L'extension Chrome fonctionne de bout en bout après validation
- [ ] L'extension Firefox fonctionne de bout en bout après validation
- [ ] `.env` absent du repo git — Task 10 🔴
- [ ] Démarrage échoue si CORS non configuré (pas de fallback `*`) — Task 11 🔴
- [ ] Schéma reports valide DPE/GES/dates/longueurs — Task 12 🟠
- [ ] `/api/location/search` limité à 10 req/min — Task 13 🟠
