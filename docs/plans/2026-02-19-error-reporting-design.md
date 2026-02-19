# Design : Remontée d'erreurs utilisateur

> **Date :** 2026-02-19
> **Scope :** Extension Chrome + backend `immo-locator-api`

## Contexte

L'extension peut extraire des valeurs incorrectes depuis une annonce Leboncoin (mauvais DPE, surface erronée, etc.) ou retourner des résultats incohérents. L'utilisateur n'a actuellement aucun moyen de signaler ces cas au développeur.

## Objectif

Permettre à l'utilisateur de signaler une erreur en un clic depuis la popup. Le rapport est stocké côté backend dans un fichier JSONL consultable à la demande.

---

## Design

### Extension — UX

Un lien **"Signaler une erreur"** est ajouté dans le header de la popup, à droite du titre. Il est visible uniquement une fois les données extraites (pas sur l'écran d'erreur).

```
┌─────────────────────────────────────────────────────┐
│  🏠  Immo Locator          [Signaler une erreur ↗]  │
├─────────────────────────────────────────────────────┤
```

**États du bouton :**
| État | Texte | Comportement |
|------|-------|--------------|
| Idle | "Signaler une erreur" | Cliquable |
| Envoi | "Envoi..." | Désactivé |
| Succès | "✓ Rapport envoyé" | Pendant 2s, puis retour idle |
| Échec | Message d'erreur discret sous le bouton | — |

### Données envoyées

```json
{
  "url": "https://www.leboncoin.fr/ventes_immobilieres/123456789.htm",
  "timestamp": "2026-02-19T10:23:00.000Z",
  "extracted": {
    "city": "Paris",
    "zipcode": "75011",
    "surface": "45",
    "terrain": "Non trouvé",
    "dpe": "D",
    "ges": "C",
    "date_diag": "12/03/2023",
    "conso_prim": "180",
    "conso_fin": "Non trouvé"
  }
}
```

### Backend — endpoint

**Route :** `POST /api/reports`

- Valide la présence de `url` et `extracted` dans le body
- Appende une ligne JSON dans `data/reports.jsonl` (créé automatiquement si absent)
- Répond `{ "success": true }` (200) ou `{ "error": "WRITE_ERROR" }` (500)
- Pas d'authentification — l'accès est restreint par CORS à l'extension

### Stockage

Fichier : `data/reports.jsonl` sur le VPS, une entrée JSON par ligne.

**Consultation :**

```bash
cat data/reports.jsonl | jq .        # tous les rapports formatés
tail -f data/reports.jsonl | jq .    # surveillance en temps réel
```

---

## Fichiers à modifier / créer

### Extension

| Fichier                      | Changement                                      |
| ---------------------------- | ----------------------------------------------- |
| `popup.html`                 | Ajouter le bouton dans le header                |
| `src/api/location-client.js` | Ajouter la fonction `sendReport(data)`          |
| `src/popup.js`               | Câbler le bouton (clic → sendReport → feedback) |

### Backend (`immo-locator-api`)

| Fichier                 | Changement                                 |
| ----------------------- | ------------------------------------------ |
| `src/routes/reports.js` | Nouveau fichier — route POST /api/reports  |
| `src/index.js`          | Enregistrer le router `/api/reports`       |
| `data/`                 | Répertoire à créer sur le VPS (gitignored) |

---

## Non-inclus (hors scope)

- Commentaire libre de l'utilisateur
- Interface d'administration pour consulter les rapports
- Authentification de l'endpoint
- Déclenchement automatique sur erreur technique
