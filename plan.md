# Plan : Publication du code source en open source

> **Objectif :** Rendre les deux repos (`AnnonceImmoLocator` + `immo-locator-api`) publics sur GitHub, en s'assurant qu'aucune donnee sensible n'est exposee et que le projet est accueillant pour des contributeurs externes.

---

## Phase 1 : Audit des secrets et donnees sensibles

### 1.1 Verifier l'historique git pour les secrets

**Repos concernes :** les deux

L'historique git est permanent — meme un fichier supprime reste accessible dans les anciens commits.

**Verifications :**

- [x] `.env` n'a **jamais** ete commite dans `immo-locator-api` (confirme : absent de l'initial commit `c0828da`)
- [x] `.env` n'existe pas dans `AnnonceImmoLocator`
- [ ] Scanner l'historique complet avec un outil dedie :
  ```bash
  # Installer truffleHog ou gitleaks
  brew install gitleaks
  gitleaks detect --source AnnonceImmoLocator --verbose
  gitleaks detect --source immo-locator-api --verbose
  ```
- [ ] Si un secret est trouve : **rreecrire l'historique** avec `git filter-repo` ou repartir d'un historique propre (squash)

### 1.2 Identifier les informations sensibles dans le code

| Fichier                                         | Donnee sensible                                                                                      | Action                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `immo-locator-api/deploy/deploy.sh`             | IP/hostname VPS (`api.immolocator.fr`), port SSH (`65422`), chemin cle SSH (`~/.ssh/id_ed25519_vps`) | Remplacer par des variables d'env ou documenter comme exemple generique |
| `immo-locator-api/deploy/setup-vps.sh`          | Configuration serveur specifique                                                                     | Rendre generique ou deplacer dans un repo prive de config               |
| `immo-locator-api/PLAN.md`                      | Chrome extension ID (`okglkdgbdbnikojffmjpodmakgjmlpda`)                                             | OK — l'ID Chrome est public par nature                                  |
| `AnnonceImmoLocator/src/api/location-client.js` | URL API (`api.immolocator.fr`)                                                                       | OK — necessaire pour le fonctionnement                                  |
| `AnnonceImmoLocator/CHANGELOG.md`               | Lien GitHub `clementbichel/AnnonceImmoLocator`                                                       | OK — sera public                                                        |
| `AnnonceImmoLocator/docs/privacy.html`          | Email `admin@immolocator.fr`                                                                         | OK — email de contact public voulu                                      |
| `immo-locator-api/.env` (local)                 | Extension IDs Chrome/Firefox                                                                         | Deja gitignore, OK                                                      |

### 1.3 Nettoyer les fichiers de build/release

**`AnnonceImmoLocator/`** contient 8 fichiers `.zip` (builds v1.0.0-v1.0.3, sources + dist). Deux sont trackes par git (`v1.0.1` et `v1.0.1-source`).

- [ ] Supprimer les `.zip` du tracking git :
  ```bash
  cd AnnonceImmoLocator
  git rm --cached immo-locator-v1.0.1.zip immo-locator-v1.0.1-source.zip
  echo "*.zip" >> .gitignore
  ```
- [ ] Supprimer les `.zip` du disque (ils sont sur GitHub Releases de toute facon)
- [ ] Verifier que le `.gitignore` exclut bien `*.zip`

---

## Phase 2 : Licence

### 2.1 Choisir une licence

Aucun fichier `LICENSE` n'existe actuellement dans les deux repos. **Obligatoire avant de rendre public** — sans licence, le code est "tous droits reserves" par defaut.

Options recommandees :

| Licence                          | Avantages                              | Inconvenients                          |
| -------------------------------- | -------------------------------------- | -------------------------------------- |
| **MIT**                          | Simple, permissive, standard           | Pas de protection copyleft             |
| **GPL v3**                       | Force le partage des modifications     | Peut decourager certains contributeurs |
| **AGPL v3**                      | Couvre aussi l'usage serveur (backend) | Plus restrictive                       |
| **MIT (extension) + AGPL (API)** | Approche hybride courante              | Deux licences a gerer                  |

**Recommandation :** MIT pour les deux (simplicite) ou MIT (extension) + AGPL (API) si tu veux proteger le backend.

- [ ] Creer `LICENSE` dans `AnnonceImmoLocator/`
- [ ] Creer `LICENSE` dans `immo-locator-api/`
- [ ] Ajouter le champ `"license"` dans les deux `package.json`

---

## Phase 3 : Documentation

### 3.1 README pour l'extension

Creer `AnnonceImmoLocator/README.md` avec :

- [ ] Description du projet (1-2 phrases)
- [ ] Screenshot/GIF de l'extension en action
- [ ] Instructions d'installation depuis le Chrome Web Store / AMO
- [ ] Instructions de developpement local :
  - `npm install`
  - `npm run build`
  - Charger l'extension en mode developpeur
- [ ] Instructions de test : `npm test`
- [ ] Architecture rapide (renvoyer vers `CLAUDE.md` ou le detailler)
- [ ] Lien vers la politique de confidentialite
- [ ] Lien vers le backend (repo API)
- [ ] Badge CI/CD (GitHub Actions)

### 3.2 README pour l'API

Creer `immo-locator-api/README.md` avec :

- [ ] Description et lien vers l'extension
- [ ] Prerequis (Node 20+, SQLite)
- [ ] Installation :
  ```bash
  cp .env.example .env
  # Editer .env avec vos valeurs
  npm install
  npm run dev
  ```
- [ ] Endpoints API documentes (resume)
- [ ] Instructions de test : `npm test`
- [ ] Notes de deploiement (resume, sans secrets)
- [ ] Lien vers l'extension (repo)

### 3.3 CONTRIBUTING.md

Un fichier par repo (ou un seul partage) :

- [ ] Comment signaler un bug (Issues)
- [ ] Comment proposer une amelioration (PR)
- [ ] Style de code (ESLint/Prettier deja en place)
- [ ] Lancer les tests avant de soumettre
- [ ] Convention de commits

### 3.4 Nettoyer/supprimer les documents internes

Les fichiers `docs/plans/` contiennent les plans d'implementation detailles (design decisions internes). Choix :

- **Option A :** Les garder (transparence sur le processus de dev)
- **Option B :** Les supprimer (bruit pour les contributeurs)

- [ ] Decider et appliquer
- [ ] Supprimer `PLAN.md` de `immo-locator-api/` (plan interne entierement complete)
- [ ] Supprimer ou adapter `research.md` a la racine (document interne)
- [ ] Adapter/supprimer `CLAUDE.md` ou le renommer en `ARCHITECTURE.md`

---

## Phase 4 : Nettoyage du code

### 4.1 Supprimer la couche de compatibilite v1.0.0

Selon la memoire projet : une fois la v1.0.0 plus utilisee, supprimer `cleanExtracted()` dans `immo-locator-api/src/routes/reports.js`.

- [ ] Verifier dans les analytics (`searches.db`) si des requetes v1.0.0 arrivent encore
- [ ] Si non : supprimer `cleanExtracted()` et appliquer le schema Zod directement sur `extracted`

### 4.2 Genericiser les scripts de deploiement

- [ ] `deploy/deploy.sh` : remplacer les valeurs hardcodees par des variables ou un fichier de config (non commite)
- [ ] `deploy/setup-vps.sh` : rendre generique (ou le deplacer hors du repo public)

### 4.3 Verifier les metadonnees git

- [ ] S'assurer que le `user.email` dans les commits n'expose pas d'email professionnel non voulu
  - Commit existant : `clement.bichel@ext.betc.com` — si c'est un email pro que tu ne veux pas rendre public, il faudra réécrire l'historique ou l'accepter
- [ ] Les co-author lines `Claude Sonnet/Opus` sont OK (indiquent l'usage d'un outil IA, transparence)

---

## Phase 5 : Preparation des repos GitHub

### 5.1 Structure des repos

Deux options :

**Option A — Monorepo (recommande) :**

- Fusionner les deux repos dans un seul repo public
- Structure : `extension/` + `api/` a la racine
- Un seul README, une seule licence, un seul issue tracker
- Plus facile a decouvrir et contribuer

**Option B — Deux repos separes (actuel) :**

- `clementbichel/immo-locator` (extension)
- `clementbichel/immo-locator-api` (API)
- Lier les deux dans les READMEs respectifs

- [ ] Choisir l'option
- [ ] Si monorepo : combiner les historiques git ou repartir avec un premier commit propre

### 5.2 Configurer GitHub

Pour chaque repo :

- [ ] Ajouter une description et des topics (tags) :
  - `chrome-extension`, `firefox-addon`, `leboncoin`, `dpe`, `real-estate`, `france`, `energy-performance`
- [ ] Configurer la branche par defaut (`main`)
- [ ] Activer les Issues
- [ ] Activer les Discussions (optionnel)
- [ ] Configurer les GitHub Actions (CI deja en place pour l'extension)
- [ ] Ajouter les secrets GitHub Actions si necessaire (Codecov token, etc.)
- [ ] Ajouter un fichier `.github/ISSUE_TEMPLATE/bug_report.md` et `feature_request.md`

### 5.3 Passer les repos en public

- [ ] Dernier audit : relire les derniers commits, verifier qu'aucun secret n'est present
- [ ] Sur GitHub : Settings → Danger Zone → Change visibility → Public
- [ ] Verifier que le CI passe en public (certains secrets GitHub ne sont pas dispo sur les forks)

---

## Phase 6 : Communication (optionnel)

- [ ] Post sur Reddit r/france, r/immobilier, r/selfhosted
- [ ] Post sur Hacker News (Show HN)
- [ ] Ajouter un lien "Source code" dans la description Chrome Web Store / AMO
- [ ] Ajouter un lien dans la privacy policy (`docs/privacy.html`)

---

## Checklist finale

| #   | Item                                          | Status                                |
| --- | --------------------------------------------- | ------------------------------------- |
| 1   | Aucun secret dans l'historique git (gitleaks) | [x]                                   |
| 2   | Scripts de deploy genericises                 | [x]                                   |
| 3   | `.zip` supprimes du tracking git              | [x]                                   |
| 4   | Fichier `LICENSE` present dans chaque repo    | [x]                                   |
| 5   | `"license"` dans `package.json`               | [x]                                   |
| 6   | `README.md` dans chaque repo                  | [x]                                   |
| 7   | `CONTRIBUTING.md`                             | N/A (portfolio, pas de contributeurs) |
| 8   | Documents internes nettoyes                   | [x]                                   |
| 9   | `cleanExtracted()` supprime si possible       | [x]                                   |
| 10  | Email de commit verifie                       | [x]                                   |
| 11  | GitHub topics/description configures          | [x]                                   |
| 12  | Issue templates                               | N/A (portfolio)                       |
| 13  | CI passe en public                            | [x]                                   |
| 14  | Repos passes en public                        | [x]                                   |

---

## Ordre d'execution recommande

| Etape | Phase                                      | Effort | Bloquant                           |
| ----- | ------------------------------------------ | ------ | ---------------------------------- |
| 1     | 1.1 — Scanner l'historique (gitleaks)      | 10 min | Oui — decide si rewrite necessaire |
| 2     | 1.2 — Genericiser deploy scripts           | 15 min | Non                                |
| 3     | 1.3 — Supprimer les .zip du git            | 5 min  | Non                                |
| 4     | 2 — Choisir et ajouter la licence          | 10 min | Oui — necessaire avant publication |
| 5     | 3.1/3.2 — Ecrire les README                | 30 min | Oui                                |
| 6     | 3.3 — CONTRIBUTING.md                      | 15 min | Non                                |
| 7     | 3.4 — Nettoyer les docs internes           | 10 min | Non                                |
| 8     | 4.1 — Supprimer cleanExtracted si possible | 10 min | Non                                |
| 9     | 4.3 — Verifier les emails de commit        | 5 min  | Decision a prendre                 |
| 10    | 5.1 — Decider mono vs multi repo           | 5 min  | Decision a prendre                 |
| 11    | 5.2 — Configurer GitHub                    | 15 min | Non                                |
| 12    | 5.3 — Passer en public                     | 2 min  | Tout le reste                      |

**Total estime : ~2h30**
