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

1. Récupérer l'ID de l'extension Chrome :
   - Aller sur `chrome://extensions/`
   - Copier l'ID (ex: `abcdefghijklmnopqrstuvwxyz123456`)

2. Mettre à jour le `.env` sur le VPS :
   ```
   CORS_CHROME_ORIGIN=chrome-extension://abcdefghijklmnopqrstuvwxyz123456
   ```

3. Redémarrer avec PM2 :
   ```bash
   pm2 restart immo-locator-api
   ```

4. Tester : ouvrir l'extension → la recherche doit toujours fonctionner. Ouvrir un autre site → un `fetch` vers l'API doit être bloqué par CORS.

**Note :** L'ID change si tu republies l'extension non packagée. L'ID sera fixe une fois publiée sur le Chrome Web Store.

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

## Task 8 (nice to have) : Cache LRU des réponses ADEME

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

## Ordre d'exécution recommandé

| Ordre | Task | Effort | Impact | Status |
|-------|------|--------|--------|--------|
| 1 | Task 1 — Validation env vars | 5 min | Fail-fast au deploy | ✅ Done |
| 2 | Task 2 — Error handler global | 10 min | Pas de 500 HTML | ✅ Done |
| 3 | Task 3 — Timeout ADEME | 5 min | Pas de requêtes bloquées | ✅ Done |
| 4 | Task 4 — Validation Zod | 30 min | Sécurité des entrées | ✅ Done |
| 5 | Task 5 — CORS vrais origins | 5 min | Restreindre l'accès | ⏳ Manuel |
| 6 | Task 6 — Logging Pino | 30 min | Debugging en prod | ⏳ TODO |
| 7 | Task 7 — UptimeRobot | 10 min | Alertes si down | ⏳ Manuel |
| 8 | Task 8 — Cache LRU | 20 min | Performance | ⏳ TODO |
| 9 | Task 9 — Deploy script | 5 min | Cleanup | ✅ Done |

**Total estimé : ~2h**

---

## Checklist de validation finale

Après toutes les tasks, vérifier :

- [x] `npm test` passe à 100% (34/34)
- [x] Le serveur refuse de démarrer sans `ADEME_API_URL`
- [x] Une requête avec un body invalide renvoie une 400 JSON propre (code `MISSING_FIELDS` compatible extension)
- [x] Une requête quand l'API ADEME est down renvoie une 502 en < 11s
- [ ] Les logs sont en JSON structuré (pas de `console.log`) — Task 6
- [ ] CORS bloque les requêtes depuis un origin non autorisé — Task 5
- [ ] UptimeRobot envoie une alerte test — Task 7
- [ ] L'extension Chrome fonctionne toujours de bout en bout
