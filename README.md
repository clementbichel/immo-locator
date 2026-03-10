# Immo Locator — Extension navigateur

Extension Chrome/Firefox qui enrichit les annonces immobilières Leboncoin avec les données officielles de diagnostic énergétique (DPE/GES) issues de la base ADEME, permettant de retrouver l'adresse réelle d'un bien.

![Screenshot](docs/screenshot.png)

## Fonctionnement

1. L'utilisateur ouvre une annonce Leboncoin et clique sur l'extension
2. L'extension extrait les données du bien (surface, DPE, GES, localisation, consommation énergétique)
3. Ces données sont envoyées à l'[API backend](https://github.com/clementbichel/immo-locator-api) qui interroge la base ADEME
4. Les résultats sont affichés avec un score de correspondance et un lien Google Maps

## Stack technique

- **Manifest V3** — Chrome + Firefox (cross-browser)
- **esbuild** — bundler (src/ → popup.js)
- **Vitest** — tests unitaires, intégration, E2E
- **ESLint + Prettier** — qualité de code
- **GitHub Actions** — CI (lint, tests, coverage) + release automatique

## Architecture

```
src/
├── popup.js                    # Logique principale, extraction des données, UI
├── api/
│   └── location-client.js      # Client API (recherche, rapports d'erreur)
├── extractors/
│   └── next-data-extractor.js  # Parsing __NEXT_DATA__ Leboncoin
└── utils/
    ├── dom-helpers.js           # Manipulation DOM sécurisée (pas de innerHTML)
    ├── error-messages.js        # Messages d'erreur en français
    ├── parsers.js               # Parsing des données extraites
    ├── score-calculator.js      # Score → couleur
    ├── url-validator.js         # Validation URL Leboncoin
    └── validation-constants.js  # Constantes de validation
```

### Extraction des données — stratégie en 3 niveaux

1. **`__NEXT_DATA__`** — parsing du JSON embarqué par Next.js (source primaire)
2. **DOM scraping** — sélecteurs CSS et regex en fallback
3. **Analyse visuelle** — détection de la lettre DPE/GES active par comparaison des tailles CSS (`getComputedStyle`)

### Sécurité

- Pas de `innerHTML` — manipulation DOM via `textContent` et `createElement` uniquement
- CSP stricte dans le manifest
- Validation des URLs (whitelist `leboncoin.fr`)
- Permissions minimales (`activeTab` + `scripting`)

## Développement

```bash
npm install
npm run build          # Bundle src/ → popup.js
npm test               # Tous les tests
npm run test:unit      # Tests unitaires
npm run test:integration
npm run test:e2e
```

### Charger l'extension en local

**Chrome :** `chrome://extensions/` → Mode développeur → Charger l'extension non empaquetée

**Firefox :** `about:debugging#/runtime/this-firefox` → Charger un module temporaire → sélectionner `manifest.json`

## Liens

- [API backend](https://github.com/clementbichel/immo-locator-api)
- [Politique de confidentialité](docs/privacy.html)
- [Chrome Web Store](https://chromewebstore.google.com/detail/immo-locator/okglkdgbdbnikojffmjpodmakgjmlpda)

## Licence

[AGPL-3.0](LICENSE)
