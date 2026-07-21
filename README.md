# Immo Locator

Extension navigateur (Chrome/Firefox) qui enrichit les annonces immobilières [Leboncoin](https://www.leboncoin.fr/) avec les données officielles de diagnostic énergétique (DPE/GES) issues de la base [ADEME](https://data.ademe.fr/), permettant de retrouver l'adresse réelle d'un bien.

![Screenshot](packages/extension/docs/screenshot.png)

## Fonctionnement

1. L'utilisateur ouvre une annonce Leboncoin et clique sur l'icône de l'extension
2. L'extension extrait automatiquement les données du bien (surface, DPE, GES, localisation, consommation énergétique) via 3 stratégies complémentaires :
   - Parsing du JSON `__NEXT_DATA__` embarqué par Next.js
   - Scraping DOM en fallback
   - Analyse visuelle des badges DPE/GES par comparaison de styles CSS
3. L'extension interroge **directement** l'API publique ADEME (`data.ademe.fr`) avec ces critères, puis score les candidats côté client — **aucun serveur intermédiaire**
4. Les résultats sont affichés avec un score de correspondance et un lien Google Maps vers l'adresse trouvée

> **Vie privée :** depuis la v2.0, l'extension n'envoie plus aucune donnée à un backend privé. Les critères de recherche partent uniquement vers l'API publique ADEME (un service de l'État) ; rien n'est collecté ni stocké de manière centralisée (cohérent avec `data_collection_permissions: none`).

## Structure du projet

```
packages/
└── extension/   # Extension Chrome/Firefox (Manifest V3)
```

Tout le code vit dans [`packages/extension/`](packages/extension/) : extraction des
données Leboncoin/SeLoger, requête ADEME directe, scoring et UI popup. Le backend
Express qui servait d'intermédiaire jusqu'à la v1.1.0 a été décommissionné en
juillet 2026 et son code supprimé.

## Installation

### Prérequis

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/clementbichel/immo-locator.git
cd immo-locator
npm install
```

### Extension

```bash
npm run build:ext                # Bundle src/ → popup.js
```

Puis charger l'extension en mode développeur :

- **Chrome :** `chrome://extensions/` → Mode développeur → Charger l'extension non empaquetée → sélectionner `packages/extension/`
- **Firefox :** `about:debugging#/runtime/this-firefox` → Charger un module temporaire → sélectionner `packages/extension/manifest.json`

### Packaging

```bash
npm run package:ext              # Zip du store + archive source AMO dans dist/
```

## Tests

```bash
npm test                # Tous les tests
npm run test:ext        # Idem, via le workspace
npm run test:watch      # Mode watch
```

## Stack technique

**Extension :**

- Manifest V3 — Chrome + Firefox (cross-browser)
- esbuild — bundler IIFE
- Vitest — tests unitaires, intégration, E2E
- ESLint + Prettier

Aucune dépendance runtime : le code livré n'utilise que les API du navigateur et
`fetch` vers `data.ademe.fr`.

## Sécurité

- Pas de `innerHTML` — manipulation DOM via `textContent` et `createElement`
- CSP stricte dans le manifest, `connect-src` limité à `data.ademe.fr`
- Permissions minimales : `activeTab` + `scripting`, aucun accès au stockage
- Aucune donnée envoyée à un serveur tiers, aucune collecte

## Liens

- [Chrome Web Store](https://chromewebstore.google.com/detail/immo-locator/okglkdgbdbnikojffmjpodmakgjmlpda)
- [Firefox Add-ons (AMO)](https://addons.mozilla.org/fr/firefox/addon/immo-locator/)
- [Politique de confidentialité](https://clementbichel.fr/immo-locator/privacy.html) (source : `packages/extension/docs/privacy.html`)
- [API ADEME — Dataset DPE](https://data.ademe.fr/datasets/dpe03existant)

## Licence

[AGPL-3.0](packages/extension/LICENSE)
