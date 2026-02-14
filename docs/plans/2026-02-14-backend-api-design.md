# Design : Backend API pour Immo Locator

**Date** : 2026-02-14
**Statut** : Validé

## Contexte

L'extension Chrome/Firefox appelle actuellement l'API ADEME directement depuis le popup. On introduit un backend intermédiaire pour :

1. **Sécurité** — cacher l'URL et les détails de l'API ADEME
2. **Enrichissement** — centraliser le scoring et le tri côté serveur
3. **Préparation future** — base pour ajouter cache, auth, logs, etc.

## Décisions

| Aspect       | Décision                                         |
| ------------ | ------------------------------------------------ |
| Stack        | Node.js / Express                                |
| Hébergement  | VPS OVHcloud, Nginx + PM2 + Let's Encrypt        |
| Repo         | Séparé (`immo-locator-api`)                      |
| Architecture | Backend intelligent (scoring + tri côté serveur) |

## Route API

### `POST /api/location/search`

**Requête** :

```json
{
  "zipcode": "75011",
  "city": "Paris",
  "dpe": "D",
  "ges": "E",
  "surface": 45,
  "date_diag": "15/03/2024",
  "conso_prim": 230,
  "conso_fin": 180
}
```

Les champs `surface`, `conso_prim`, `conso_fin` sont des nombres (pas de chaînes avec unités).

**Réponse succès** — `200 OK` :

```json
{
  "results": [
    {
      "address": "12 Rue de la Roquette, Paris",
      "city": "Paris",
      "dpe": "D",
      "ges": "E",
      "surface": 43.5,
      "diagnosis_date": "2024-03-12",
      "primary_energy": 225,
      "score": 87
    }
  ],
  "count": 1
}
```

**Réponse erreur** — `400 / 500` :

```json
{
  "error": "MISSING_FIELDS",
  "message": "Champs manquants : Localisation, Surface",
  "missing": ["Localisation", "Surface"]
}
```

## Structure du backend

```
immo-locator-api/
├── src/
│   ├── index.js              # Point d'entrée Express
│   ├── routes/
│   │   └── location.js       # POST /api/location/search
│   ├── services/
│   │   └── dpe-service.js    # Validation, appel ADEME, scoring, tri
│   ├── clients/
│   │   └── ademe-client.js   # Construction params + appel HTTP ADEME
│   └── utils/
│       └── parsers.js        # Parsing dates, calcul de scores
├── .env                      # ADEME_API_URL, PORT, CORS origins
├── package.json
└── README.md
```

3 couches : route (HTTP) → service (métier) → client (ADEME).

## Sécurité

- Variables d'environnement pour config sensible (`.env`)
- Rate limiting (`express-rate-limit`)
- CORS restreint aux origines Chrome et Firefox (`chrome-extension://<id>`, `moz-extension://<id>`), configurables via `.env`
- Helmet pour les headers de sécurité

## Déploiement

- PM2 pour le process management
- Nginx en reverse proxy avec SSL (Let's Encrypt)
- Sous-domaine dédié

## Modifications côté extension

- `popup.js` : remplacer l'appel direct ADEME par `POST /api/location/search`, parser les valeurs numériques avant envoi, afficher les résultats scorés directement
- `manifest.json` : changer la CSP (`connect-src` vers le domaine du backend)
- Supprimer côté extension : `calculateMatchScore`, `sortResultsByScore`, `buildAdemeParams`, `buildAdemeUrl`
