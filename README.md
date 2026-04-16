## orch-publi

Outil interne pour préparer et exporter des contenus marketing **MEA** et **macarons** (HTML + images) pour le site Orchestra.

L’application permet de :

- **Éditer des briefs** avec plusieurs sections (MEA, macarons, etc.)
- **Prévisualiser** les rendus dans une iframe sandboxée (sans clics accidentels)
- **Gérer une médiathèque d’images** (upload, drag & drop, filtres par semaine / année / type)
- **Exporter** le HTML final et un ZIP d’images (macarons en `70x70` en `.jpg` + `.webp`)
- Ajouter des **commentaires développeur** (non exportés) sur chaque MEA / macaron

---

## Stack technique

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Drizzle ORM** + **Neon Postgres**
- **shadcn/ui** (Radix UI)

---

## Démarrage du projet

### Prérequis

- Node.js (version LTS recommandée)
- Un compte **Neon** configuré (voir variables d’environnement)

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

L’application est accessible sur `http://localhost:3000`.

### Lint

```bash
npm run lint
```

---

## Variables d’environnement

Créer un fichier `.env.local` à la racine du projet, par exemple :

```bash
DATABASE_URL="postgresql://..."
NEON_DATABASE_URL="postgresql://..."
```

Les noms exacts peuvent varier selon ta configuration actuelle (voir `.env.local` existant).

---

## Fonctionnalités clés

- **Briefs**
  - Liste triable des briefs
  - Protection contre les **modifications non sauvegardées** (popin + raccourci `Ctrl+S`)

- **Macarons**
  - Éditeur sous forme d’**accordéon**
  - Image en **70x70** dans l’éditeur
  - Champ **semaine + ID d’image** en premier
  - Champ **commentaire...** en dernier, avec bordure rouge si rempli
  - Export HTML + **export ZIP images (.jpg + .webp)** au bon chemin CMS

- **MEA**
  - Éditeur complet (titre, prix, club, boutons…)
  - Champ **semaine + ID d’image** en premier
  - Champ **commentaire...** en dernier, avec bordure rouge si rempli
  - Icône warning dans l’aperçu si commentaire présent

- **Médiathèque**
  - Upload par bouton + **drag & drop**
  - Métadonnées : **label, week, year, type (macaron/mea/other)**
  - Filtres dynamiques sur **année**, **semaine** et **type**
  - Pré-filtrage par type en fonction de l’éditeur ouvrant la médiathèque

---

## Export

- **HTML** : export des sections MEA / macarons dans le format attendu par le CMS Orchestra.
- **Images** : route API `GET /api/export/images` qui génère un ZIP :
  - Dossiers `homepage/{year}/wk{week}/{locale}/`
  - Fichiers `quickaccess-{imageId}.jpg` et `quickaccess-{imageId}.webp`

Les champs **commentaires** ne sont jamais inclus dans l’export final, ils ne servent qu’aux développeurs.
