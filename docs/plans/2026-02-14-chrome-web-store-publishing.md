# Plan de publication Chrome Web Store

## Bloquant

- [ ] **HTTPS sur le backend** — Configurer SSL sur le VPS (Let's Encrypt / Certbot), mettre à jour `API_BASE_URL` dans `src/api/location-client.js` et `connect-src` dans `manifest.json`
- [ ] **Privacy policy** — Rédiger et héberger une politique de confidentialité (données d'annonces envoyées au backend). Fournir l'URL lors de la soumission
- [ ] **Compte développeur Chrome** — Créer un compte sur le [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (5$ de frais uniques)

## Requis pour la soumission

- [ ] **Screenshots** — Capturer 1-3 screenshots de l'extension en action (1280x800 ou 640x400)
- [ ] **Description store** — Rédiger une description détaillée pour la fiche (fonctionnalités, cas d'usage)
- [ ] **Catégorie** — Choisir la catégorie appropriée (ex: Productivity / Tools)
- [ ] **Version semver** — Passer `"version": "1.0"` à `"1.0.0"` dans `manifest.json`

## Recommandé

- [ ] **Domaine propre** — Remplacer `vps-9f0f5451.vps.ovh.net` par un domaine dédié (plus professionnel, simplifie SSL)
- [ ] **Support Firefox** — Publier sur AMO (le code est déjà compatible via `globalThis.browser ??= globalThis.chrome`)
