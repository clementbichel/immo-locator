# Plan de publication Chrome Web Store

## Bloquant

- [x] **HTTPS sur le backend** — Configurer SSL sur le VPS (Let's Encrypt / Certbot), mettre à jour `API_BASE_URL` dans `src/api/location-client.js` et `connect-src` dans `manifest.json`
- [ ] **Privacy policy** — Rédiger et héberger une politique de confidentialité (données d'annonces envoyées au backend). Fournir l'URL lors de la soumission
- [ ] **Compte développeur Chrome** — Créer un compte sur le [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (5$ de frais uniques)

## Requis pour la soumission

- [ ] **Screenshots** — Capturer 1-3 screenshots de l'extension en action (1280x800 ou 640x400)
- [ ] **Description store** — Rédiger une description détaillée pour la fiche (fonctionnalités, cas d'usage)
- [ ] **Catégorie** — Choisir la catégorie appropriée (ex: Productivity / Tools)
- [x] **Version semver** — Passer `"version": "1.0"` à `"1.0.0"` dans `manifest.json`

## Recommandé

- [x] **Domaine propre** — Remplacer `vps-9f0f5451.vps.ovh.net` par un domaine dédié (plus professionnel, simplifie SSL)
- [ ] **Support Firefox** — Publier sur AMO (le code est déjà compatible via `globalThis.browser ??= globalThis.chrome`)

---

# Backend — Production Readiness

## Sécurité (prioritaire)

- [ ] **CORS : configurer les vrais origins** — Mettre l'ID réel de l'extension Chrome dans `CORS_CHROME_ORIGIN` du `.env` sur le VPS. Actuellement fallback `*` si non défini
- [ ] **Validation d'entrée stricte** — Ajouter un schéma Zod/Joi sur `POST /api/location/search` (types, formats, longueurs) pour protéger contre les paramètres malformés
- [ ] **Middleware d'erreur global** — Ajouter `app.use((err, req, res, next) => ...)` pour catcher les erreurs non gérées dans les routes

## Observabilité

- [ ] **Logging structuré** — Remplacer `console.log/error` par Pino (timestamps, niveaux, request ID)
- [ ] **Monitoring / alertes** — Configurer UptimeRobot (gratuit) sur `/health` pour être alerté si le serveur tombe

## Robustesse

- [ ] **Timeout sur les appels ADEME** — Ajouter un `AbortSignal.timeout()` sur le `fetch()` vers l'API ADEME (ex: 10s)
- [ ] **Validation des env vars au démarrage** — Vérifier la présence des variables requises (`ADEME_API_URL`, `CORS_CHROME_ORIGIN`) au boot et échouer explicitement si manquantes

## Nice to have

- [ ] **Cache des réponses ADEME** — Cache LRU en mémoire (TTL ~1h) pour réduire la latence et la charge sur l'API ADEME
- [ ] **Mettre à jour le script de déploiement** — Remplacer `vps-9f0f5451.vps.ovh.net` par `api.immolocator.fr` dans `deploy.sh`
