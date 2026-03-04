# Plan de publication Chrome Web Store

## Bloquant

- [x] **HTTPS sur le backend** — Configurer SSL sur le VPS (Let's Encrypt / Certbot), mettre à jour `API_BASE_URL` dans `src/api/location-client.js` et `connect-src` dans `manifest.json`
- [x] **Privacy policy** — Rédiger et héberger une politique de confidentialité (données d'annonces envoyées au backend). Fournir l'URL lors de la soumission
- [x] **Compte développeur Chrome** — Créer un compte sur le [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (5$ de frais uniques)

## Requis pour la soumission

- [x] **Screenshots** — Capturer 1-3 screenshots de l'extension en action (1280x800 ou 640x400)
- [x] **Description store** — Rédiger une description détaillée pour la fiche (fonctionnalités, cas d'usage)
- [x] **Catégorie** — Choisir la catégorie appropriée (ex: Productivity / Tools)
- [x] **Version semver** — Passer `"version": "1.0"` à `"1.0.0"` dans `manifest.json`

## Recommandé

- [x] **Domaine propre** — Remplacer `vps-9f0f5451.vps.ovh.net` par un domaine dédié (plus professionnel, simplifie SSL)
- [x] **Support Firefox** — Publier sur AMO (le code est déjà compatible via `globalThis.browser ??= globalThis.chrome`)

---

# Backend — Production Readiness

## Sécurité (prioritaire)

- [x] **CORS : configurer les vrais origins** — Mettre l'ID réel de l'extension Chrome dans `CORS_CHROME_ORIGIN` du `.env` sur le VPS
- [x] **Validation d'entrée stricte** — Schéma Zod sur `POST /api/location/search` (types, formats, longueurs)
- [x] **Middleware d'erreur global** — `app.use((err, req, res, next) => ...)` pour catcher les erreurs non gérées

## Observabilité

- [x] **Logging structuré** — Pino avec pino-http (timestamps, niveaux, request ID)
- [x] **Monitoring / alertes** — UptimeRobot sur `/health`

## Robustesse

- [x] **Timeout sur les appels ADEME** — `AbortSignal.timeout(10_000)` sur le fetch ADEME
- [x] **Validation des env vars au démarrage** — Fail-fast si variables requises manquantes

## Nice to have

- [x] **Cache des réponses ADEME** — Cache LRU en mémoire (TTL 1h, max 500 entrées)
- [x] **Mettre à jour le script de déploiement** — `api.immolocator.fr` dans `deploy.sh`
