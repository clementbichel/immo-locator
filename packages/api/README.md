# Immo Locator — API backend

API Node.js qui sert de proxy intelligent entre l'[extension navigateur Immo Locator](https://github.com/clementbichel/AnnonceImmoLocator) et la base de données ADEME des diagnostics de performance énergétique.

## Fonctionnement

1. L'extension envoie les données extraites d'une annonce Leboncoin (surface, DPE, GES, localisation)
2. L'API interroge la base ADEME (`dpe03existant`) avec des filtres adaptés (correspondance exacte + marges)
3. Les résultats sont scorés selon leur proximité avec l'annonce et renvoyés triés

## Stack technique

- **Express 5** — framework HTTP
- **SQLite** (better-sqlite3) — analytics des recherches + rapports d'erreur
- **Zod** — validation des entrées (schemas stricts)
- **Pino** — logging structuré JSON + rotation des fichiers
- **lru-cache** — cache en mémoire des réponses ADEME (500 entrées, TTL 1h)
- **Helmet** — headers de sécurité
- **express-rate-limit** — rate limiting global + par endpoint
- **PM2 + Nginx** — déploiement avec reverse proxy et SSL (Let's Encrypt)
- **Vitest + Supertest** — tests

## Architecture

```
src/
├── index.js              # Setup Express, middlewares, validation env
├── db.js                 # SQLite : schéma, CRUD, rétention 90 jours
├── logger.js             # Pino + rotating-file-stream
├── clients/
│   └── ademe-client.js   # Client ADEME (cache LRU, circuit breaker, timeout 10s)
├── routes/
│   ├── location.js       # POST /api/location/search
│   └── reports.js        # POST /api/reports
├── schemas/
│   └── search.js         # Schéma Zod de validation des recherches
├── services/
│   └── dpe-service.js    # Algorithme de scoring des résultats
└── utils/
    └── parsers.js        # Parsing des dates françaises
```

### Endpoints

| Méthode | Route                  | Description                                        |
| ------- | ---------------------- | -------------------------------------------------- |
| `POST`  | `/api/location/search` | Recherche ADEME à partir des données d'une annonce |
| `POST`  | `/api/reports`         | Signalement d'erreur d'extraction (crowdsourcing)  |
| `GET`   | `/health`              | Health check                                       |

### Sécurité

- CORS strict (origins Chrome/Firefox uniquement, pas de wildcard)
- Rate limiting : 30 req/min global, 20 req/min sur `/search`
- Validation Zod `.strict()` sur toutes les entrées
- Prepared statements SQL + protection path traversal
- Payload limité à 10 KB
- Circuit breaker sur l'API ADEME (3 échecs → 30s de cooldown)
- fail2ban sur Nginx (ban IP après 20 erreurs 404 en 60s)

### Scoring

Le score de correspondance part de 100 et déduit :

- **Surface** : −2 points par % d'écart
- **Date diagnostic** : −2 points par jour d'écart
- **Consommation énergétique** : −1 point par % d'écart

## Installation

```bash
cp .env.example .env     # Remplir les variables
npm install
npm run dev              # Démarrage avec hot reload + logs lisibles
```

## Tests

```bash
npm test                 # 59 tests (routes, schemas, services, clients)
```

## Déploiement

Scripts de déploiement dans `deploy/` :

```bash
cp deploy/.env.example deploy/.env   # Remplir host, port SSH, clé
./deploy/deploy.sh                    # rsync + npm install + PM2 restart
```

## Liens

- [Extension navigateur](https://github.com/clementbichel/AnnonceImmoLocator)
- [Chrome Web Store](https://chromewebstore.google.com/detail/immo-locator/okglkdgbdbnikojffmjpodmakgjmlpda)

## Licence

[AGPL-3.0](LICENSE)
