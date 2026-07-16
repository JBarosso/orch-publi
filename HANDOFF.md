# Handoff orch-publi — État des lieux pour Claude Code

Document de reprise de projet. Dernière mise à jour : **19 mai 2026** (branche `master`, commit `83b5464` — *correction css*).

---

## 1. Contexte

**orch-publi** est un outil interne Orchestra pour préparer des contenus marketing homepage :

- **Macarons** (quickaccess) — barre d'icônes rondes 70×70
- **MEA** (mise en avant) — blocs promo avec image, prix, club, boutons

L'outil permet d'**éditer**, **prévisualiser**, **gérer les assets** et **exporter** (HTML CMS + ZIP images).

**Repo** : `__PERSO/orch-publi`  
**Stack** : Next.js 16, React 19, TypeScript, Tailwind 4, Drizzle + Neon Postgres, shadcn/ui

---

## 2. Ce qui est livré et fonctionnel

### Briefs & éditeur
- Liste des briefs (dashboard `/`) avec statuts : `draft` | `published` | `treated`
- Éditeur brief `/briefs/[id]` avec panneau éditeur + aperçu redimensionnable (`react-resizable-panels`)
- Boutons **Desktop / Mobile** pour ajuster la largeur de l'aperçu
- Protection **modifications non sauvegardées** + raccourci `Ctrl+S`
- Duplication de briefs

### Sections dynamiques (refactor majeur récent)
- Un brief peut avoir **N sections** (plus seulement 1 macaron + 1 MEA fixes)
- Types supportés : `macarons` | `mea`
- Par section : **créer**, **renommer**, **dupliquer**, **supprimer**, **toggle visibilité** aperçu
- Titre personnalisé affiché dans l'aperçu et sur la page export
- API : `src/app/api/sections/route.ts` (POST création/duplication, PUT mise à jour, DELETE)

### Macarons
- Éditeur accordéon, drag & drop réordonnancement
- Champs : label, liens (cgid/cid/url), image (médiathèque), semaine/ID image, commentaire dev
- Preview iframe `srcdoc` sandboxée
- Export HTML CMS + export ZIP images (`quickaccess-{id}.jpg` + `.webp`)

### MEA
- Éditeur complet : image, overlay, logo marque, pricing (standard / barré / custom), club, boutons
- Modes prix, icône club, labels configurables
- Preview iframe + export HTML CMS

### Médiathèque (`/media`)
- Upload + drag & drop
- Métadonnées : `label`, `year`, `week`, `type` (`macaron` | `mea` | `other`)
- Filtres dynamiques (année, semaine, type)
- Pré-filtrage par type selon l'éditeur ouvrant la médiathèque

### Export (`/briefs/[id]/export`)
- HTML par section (copie presse-papier)
- Téléchargement ZIP images pour sections macarons
- Routes : `GET /api/export`, `GET /api/export/images`

### Commentaires développeur
- Champ `comment` sur chaque item macaron/MEA (non exporté en prod)
- Bordure rouge dans l'éditeur si rempli
- Overlay dans l'aperçu iframe : bordure rouge + icône `i`
- Logique partagée : `src/components/preview-comment-overlay.ts`  
  ⚠️ Pas encore un composant React unique injecté partout — logique dupliquée dans les templates `export.ts`

### Auth
- Login simple cookie `bb_session` (`src/lib/auth.ts`, `src/proxy.ts`)
- Middleware proxy redirige vers `/login` si pas de session
- Chemins publics : `/login`, `/api/auth/*`, `/api/preview/cms-css`
- Exclusions matcher : `_next/static`, `uploads/`, `fonts/`

### Langues briefs
Locales supportées : `FR`, `BEFR`, `BENL`, `GR`, `ES` (liste dynamique, pas forcément toutes utilisées à chaque fois)

---

## 3. Architecture — fichiers clés

```
src/
├── app/
│   ├── (app)/
│   │   ├── page.tsx                    # Dashboard briefs
│   │   ├── media/page.tsx              # Médiathèque
│   │   └── briefs/[id]/
│   │       ├── page.tsx                # Éditeur principal (gros fichier ~700 lignes)
│   │       └── export/page.tsx         # Page export HTML/images
│   └── api/
│       ├── briefs/                     # CRUD briefs
│       ├── sections/                   # CRUD sections dynamiques
│       ├── assets/                     # Médiathèque + filters + backfill
│       ├── export/                     # HTML + images ZIP
│       └── preview/cms-css/            # Proxy CSS Orchestra
├── templates/
│   ├── macarons/
│   │   ├── editor.tsx, preview.tsx
│   │   ├── macaron-item-editor.tsx
│   │   ├── export.ts                   # generateMacaronsHTML + generatePreviewHTML
│   │   └── schema.ts
│   └── mea/
│       ├── editor.tsx, preview.tsx
│       ├── mea-item-editor.tsx
│       ├── export.ts                   # generateMeaHTML + generatePreviewHTML
│       └── schema.ts
├── components/
│   ├── preview-comment-overlay.ts
│   ├── media/                          # dialogs médiathèque
│   └── briefs/                         # liste, badges, duplication
├── lib/
│   ├── schema.ts                       # Drizzle schema
│   ├── cms-css.ts                      # URL global.css + href proxy preview
│   ├── db.ts, auth.ts
├── types/index.ts
└── proxy.ts                            # Auth middleware
```

---

## 4. Modèle de données (Neon / Drizzle)

### `briefs`
`id`, `slug`, `year`, `week`, `locale`, `index`, `status`, timestamps

### `brief_sections`
`id`, `briefId`, `type` (`macarons`|`mea`), `title`, `order`, `content` (jsonb), `visible`

Le `content` jsonb contient :
- Macarons : `{ items: MacaronItem[] }`
- MEA : `{ items: MeaItem[] }`

### `assets`
`id`, `url`, `type`, `label`, `mimeType`, `year`, `week`

Pas de dossier `drizzle/migrations` — le projet utilise `npm run db:push`.

---

## 5. Système de preview iframe (point critique)

Les aperçus macarons/MEA génèrent du HTML complet injecté via `srcDoc` dans une iframe `sandbox="allow-scripts"`.

### CSS Orchestra
- Le site Orchestra utilise `global.css` (Bootstrap + styles métier)
- Charger ce CSS **directement** depuis `fr.shop-orchestra.com` dans une iframe `srcdoc` provoque des **erreurs CORS** en console (origin `null`)

### Solution actuelle (commit `4f3934a`)
- Proxy same-origin : `/api/preview/cms-css`
- Les previews chargent : `<link rel="stylesheet" href="/api/preview/cms-css" />`
- Constantes dans `src/lib/cms-css.ts` :
  - `CMS_CSS_URL` → URL Orchestra distante
  - `PREVIEW_CMS_CSS_HREF` → `/api/preview/cms-css`
- L'**export CMS** n'utilise pas ce proxy (le site Orchestra charge déjà `global.css`)

### Problèmes CSS connus (à traiter)

| Problème | Cause | Piste de fix |
|----------|-------|--------------|
| `404` sur `/fonts/LatoRegular.woff2` | Le CSS proxifié contient `url("../../fonts/...")` résolu vers `localhost/fonts/` | Ajouter `rewriteCssAssetUrls()` dans le proxy pour réécrire les `url()` relatives en URLs absolues Orchestra |
| `ico-club.svg` erreur réseau | Chargé depuis CDN externe en preview MEA | Utiliser `public/icons/ico-club.svg` (fichier déjà présent) + exclure `/icons/` du proxy auth |
| `Alphakind.ttf` manquant | Preview MEA référence `/fonts/Alphakind.ttf` mais **le fichier n'est pas dans `public/fonts/`** | Ajouter la font dans `public/fonts/` ou pointer vers CDN Orchestra |
| Hash version CSS (`v1776150212293`) | URL hardcodée, peut expirer côté Orchestra | Prévoir mécanisme de mise à jour ou variable d'env |

---

## 6. Dettes techniques / travail en cours

### P0 — à faire en priorité (cf. `roadmap.md`)

1. **Finaliser le proxy CSS**
   - Réécriture des `url()` relatives (fonts, assets)
   - Servir `ico-club.svg` en local en preview
   - Vérifier `Alphakind.ttf` dans `public/fonts/`

2. **Composant commentaire preview unifié**
   - Demande utilisateur : un seul composant avec parent `position: relative`
   - Aujourd'hui : `preview-comment-overlay.ts` partage les styles mais l'injection HTML est dupliquée dans `macarons/export.ts` et `mea/export.ts`

3. **Module traduction (onglet dédié)** — P0 roadmap — 🚧 **v1 codée (15 juil. 2026), en attente de `npm run db:push` + vérification**
   - Modèle choisi : **glossaire global clé/valeur** (une valeur par langue)
   - Table `translations` (key unique + values jsonb) — **nécessite `npm run db:push`**
   - Page `/translations` (onglet sidebar) : table éditable clé × langues, recherche, ajout/suppression, Ctrl+S
   - API : `GET/POST/DELETE /api/translations`, import merge (`/api/translations/import`), export (`/api/translations/export?format=json|csv`)
   - CSV : délimiteur `;` + BOM (Excel FR), parser tolérant `,`, colonnes langues reconnues par code (FR, BEFR…)
   - Helpers : `src/lib/translation-csv.ts` (pur), `src/lib/translations.ts` (upsert)
   - ✅ Table créée en base + `drizzle.config.ts` charge maintenant `.env.local` (db:push OK partout)
   - ✅ **Base de 141 traductions importée** (15 juil. 2026) depuis les Excel de `trad/` (HP CAT + niveau 2)
     - Convention de clés : `hp-cat.<onglet>.<id-cms-ou-slug-fr>` (ex: `hp-cat.niv2.auto-isize-bebe`)
     - Fichier ré-importable : `trad/import-glossaire.json`
     - À curer côté métier : `hp-cat.puericulture.je-decouvre-2` (FR erroné dans l'Excel source, devrait être « Télécharger » — ✅ corrigé par Jordan dans l'UI), entrées contenant « id page show » et notes libres (`hp-cat.titres.liste-de-naissance-lien-vers-lp-...`)
   - ✅ **Duplication avec traduction** (15 juil. 2026) : switch « Traduire vers la langue de destination » dans le dialog de duplication (visible si la langue change)
     - Substitution par correspondance exacte normalisée sur le glossaire (`src/lib/translate-content.ts`), côté serveur dans `POST /api/briefs/[id]/duplicate` (param `translate`)
     - Champs traduits — macarons : label (minuscules forcées, alerte si > 16 car. après traduction) ; MEA : titre, overlay, avant-prix, prix custom, label club, textes de boutons
     - Textes introuvables ou ambigus (plusieurs traductions possibles) : laissés en langue source + note `[Traduction] À vérifier : ...` ajoutée au commentaire dev de l'item (bordure rouge dans l'éditeur, jamais exporté) ; commentaires existants préservés
     - Toast récapitulatif après duplication : X traduits / Y à vérifier
     - ⚠ Pièges corrigés après test réel : les briefs historiques stockent `locale` en **minuscules** (`"fr"`) alors que le glossaire est indexé `"FR"` (normalisation majuscules aux 2 bouts) ; les textes copiés du CMS contiennent des **zero-width spaces** (U+200B, strippés au matching) ; la casse est préservée (source tout minuscules → traduction minuscules, sinon casse du glossaire)

4. ~~**Normalisation upload images MEA**~~ ✅ **Fait (15 juil. 2026)**
   - Specs centralisées dans `src/lib/upload-specs.ts` (source de vérité client + serveur)
   - Validation à l'upload : format (JPEG/PNG/WebP), poids max 15 Mo, dimensions min = dimensions cibles, label requis pour MEA
   - Le serveur impose les dimensions par type (macaron 200×200 PNG, MEA 600×400 JPEG, other libre borné 1600px) — il ne fait plus confiance au client
   - Dialog upload : sélecteur de type (médiathèque), champs année/semaine, erreurs serveur remontées en toast

5. ~~**Paramétrage rétention données**~~ ✅ **Fait (15 juil. 2026)** — v1 dry-run + purge manuelle
   - Cadrage validé par Jordan : briefs **traités** plus vieux que la durée + assets **orphelins** anciens (non référencés par les briefs restants) ; pas de purge automatique en v1 (cron Vercel = v2 après période d'observation)
   - Table `settings` (clé/valeur jsonb), durée par défaut 24 mois (1–120)
   - Page `/settings` (onglet Paramétrage) : réglage durée + aperçu dry-run (liste briefs/images éligibles) + bouton « Purger maintenant » avec confirmation
   - API : `GET/PUT /api/settings`, `GET /api/retention/purge` (dry-run), `POST` (purge réelle)
   - Logique : `src/lib/retention.ts` — suppression briefs en cascade (sections), unlink fichiers `public/uploads`, les images encore référencées ne sont jamais supprimées

### P1 — templates avancés ✅ **Fait (16 juil. 2026)** — en attente de validation Jordan

Cadrage validé par Jordan : templates **à champs libres** (blocs génériques), conversion section → template **indépendante** (snapshot figé), gestion via **onglet « Templates » dédié** avec statuts.

- **Modèle** : un template = nom + layout + liste ordonnée de blocs génériques (`title` | `text` | `image` | `button`). Layouts prédéfinis : `stack` (blocs dans l'ordre, centrés), `image-left`, `image-right` (zone image / zone contenu). Types + constantes dans `src/types/index.ts` (`CustomTemplate`, `CustomContent`, `CustomBlock`, `CUSTOM_LAYOUTS`, `TEMPLATE_STATUS_CONFIG`)
- **DB** : table `custom_templates` (name, status `draft|published|archived`, layout, blocks jsonb) — db:push fait
- **Onglet `/templates`** (sidebar) : liste, création, statuts (publier / archiver / brouillon via menu), suppression ; éditeur dédié `/templates/[id]` (nom, statut, blocs + aperçu, Ctrl+S). Seuls les templates **publiés** sont proposés dans l'éditeur de brief
- **Sections custom dans un brief** : type de section `custom` — création vierge ou depuis un template publié (dialogue « Créer une section »). L'instanciation est un **snapshot** : ids de blocs et ids d'image régénérés, aucun lien conservé (modifier/supprimer le template n'affecte pas les sections)
- **Conversion section → template** : icône dédiée dans le header des sections custom → crée un template **brouillon** indépendant (le commentaire dev n'est pas embarqué)
- **Module** : `src/templates/custom/` (schema.ts, export.ts, editor.tsx, preview.tsx) — même structure que macarons/mea. Éditeur : layout + ajout/réordonnancement dnd des blocs + commentaire dev **au niveau section** (overlay rouge dans la preview, jamais exporté)
- **Export** : HTML générique scopé `.custom-section` ; images en chemins CMS `custom-{imageId}.jpg/webp?$staticlink$` ; boutons cgid/cid/url comme les macarons ; ZIP images sans redimensionnement forcé (dimensions libres). API : `GET/POST/PUT/DELETE /api/templates`
- **Traduction à la duplication** : blocs titre/texte/bouton passés au glossaire ; notes `[Traduction] À vérifier` regroupées dans le commentaire de la section (les blocs image ne sont pas traduits)
- Tests e2e passés (25 vérifications : CRUD, snapshot, export HTML/zip, conversion, duplication traduite FR→ES)

### P2 — modules métier
- Global header, Carousel, Bloc Edito, HP CAT Pueri, Info sup (lien PowerPoint)

---

## 7. Roadmap & questions ouvertes

**Décisions prises (15 juil. 2026)** :

- Le fix du proxy CSS preview (section 5) est **pris en main par Jordan directement** — ne pas y toucher.
- Module traduction = **glossaire global clé/valeur** (une valeur par langue, import/export JSON/CSV global), pas de vue de traduction par brief.

Voir `roadmap.md` pour le détail. Questions non tranchées :

1. Spécificité pays = override ou contenu distinct ?
2. Import/export traduction : niveau brief, section ou global ?
3. Info sup PowerPoint : URL libre ou upload hébergé ?
4. ~~Rétention : quelles tables, hard delete ou soft delete ?~~ → tranché (hard delete, briefs traités + assets orphelins)
5. ~~Conversion section→template : sync ou indépendance ?~~ → tranché (**indépendance**, snapshot figé)
6. HP CAT / Pueri : un ou deux modules ?

---

## 8. Setup développeur

```bash
cd __PERSO/orch-publi
npm install
npm run dev          # http://localhost:3000
```

`.env.local` :
```bash
DATABASE_URL="postgresql://..."
NEON_DATABASE_URL="postgresql://..."
```

Scripts DB :
```bash
npm run db:push      # sync schema
npm run db:studio    # explorer la DB
```

**Important** : Next.js 16 — lire `AGENTS.md` / `node_modules/next/dist/docs/` avant de coder (APIs différentes de Next 14).

Redémarrer le serveur après modification de `next.config.ts` (headers CORS fonts).

---

## 9. Conventions à respecter

- **Minimiser le scope** des diffs, réutiliser les patterns existants
- Templates = dossier par type (`editor`, `preview`, `export`, `schema`, `*-item-editor`)
- Export HTML = chemins CMS (`?$staticlink$`, `$url(...)$`) — preview = URLs réelles / locales
- Commentaires dev **jamais** dans l'export prod
- Langue utilisateur : **français** pour l'UI
- Ne pas commit sans demande explicite
- Auth cookie simple — pas de NextAuth complet malgré la dépendance `next-auth` dans package.json

---

## 10. Historique git récent (contexte)

```
83b5464 correction css
4f3934a feat: update CMS CSS handling in export templates   ← proxy /api/preview/cms-css
d0b8ee6 style: enhance layout responsiveness
059c639 feat: improve preview comment handling
9b7acab feat: enhance BriefEditorPage (sections dynamiques, desktop/mobile)
fc9b197 feat: update locale handling and export styles
46c1167 feat: section titles in export
fbb8b1f feat: CORS headers fonts + comment styling
7aa96a1 feat: MEA functionality
970523a feat: initial commit
```

Working tree **propre** au moment de ce handoff (`master` = `origin/master`).

---

## 11. Prochaines actions recommandées pour Claude Code

Ordre suggéré :

1. **Stabiliser preview CSS** (rewrite URLs proxy + fonts locales + ico-club local)
2. **Vérifier régression** macarons + MEA après fix (hard refresh, redémarrer dev server pour vider cache proxy CSS)
3. **Refactor commentaire preview** en composant unique
4. **Démarrer Sprint A roadmap** : cadrage modèle Traduction + spec upload MEA
5. Mettre à jour `README.md` (sections dynamiques, proxy CSS, roadmap) si besoin

---

## 12. Pièges à éviter

- Ne pas recharger `global.css` Orchestra **directement** dans les iframes preview → CORS console
- Ne pas dupliquer manuellement les classes Bootstrap — utiliser le proxy CSS
- Les iframes `srcdoc` résolvent les URLs relatives vers l'origine parent (`localhost:3000`)
- Le proxy auth bloque `/fonts/` et `/uploads/` mais **pas encore `/icons/`** — à corriger si assets locaux preview
- `CMS_CSS_URL` contient un hash version Orchestra qui peut changer
- `public/fonts/Alphakind.ttf` semble **absent** alors que MEA preview l'utilise
