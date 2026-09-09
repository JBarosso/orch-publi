# Roadmap technique

Complément à [roadmap.md](roadmap.md), qui couvre le **produit**. Ce document couvre la
**structure du code** : ce qui freine l'ajout de templates, ce qui casse silencieusement, et
les deux plafonds de performance identifiés.

Établi le 2026-09-08 après audit du code existant.

## Pourquoi maintenant

Le déclencheur n'est pas théorique. Le bug de nommage des images corrigé début septembre
(fichier exporté `quickaccess-1` alors que le HTML pointait sur `quickaccess-4`) existait
parce que la logique de position était **dupliquée par template** entre `export.ts` et
`section-images.ts`. Six copies, cinq avaient divergé.

Chaque nouveau template se paie aujourd'hui en modifiant ~6 endroits qui font tous un
`if (section.type === ...)` :

- `src/app/(app)/briefs/[id]/page.tsx` — union de types, `<Select>`, branche éditeur, branche preview
- `src/lib/section-images.ts`
- `src/lib/freeze-content-week.ts`
- `src/app/api/export/route.ts`
- `src/lib/section-labels.ts`

**Lien avec la roadmap produit :** le P1 « création de custom template » et
« conversion section → template », ainsi que la note du plan produit (« ces modules
gagneraient à être branchés sur le même moteur de templates »), supposent tous ce moteur.
Le registre (phase 1) en est le prérequis direct.

---

## Phases

Ordre volontaire : le filet de sécurité avant le refactor, le registre avant le découpage
de `page.tsx` (qu'il vide de moitié gratuitement).

### Phase 0 — Filet de sécurité ✅ fait le 2026-09-09

Aucun test n'existe aujourd'hui, et le typecheck est le seul garde-fou. Refactorer sans
filet la logique qui vient d'être écrite serait le mauvais ordre.

Mettre en place Vitest (le moins de friction avec Next/TS, ~20 lignes de config) et couvrir
les fonctions **pures** existantes :

- `src/lib/cms-image-path.ts` — `normalizeCustomPath`, `resolveCustomFolder`,
  `resolveCmsFolder`, `resolveImageBaseName`, `buildCmsImagePath`
- `src/lib/parse-cms-html.ts` — `parseCmsImagePath`, `parseCmsLink`,
  `freezeImportedPosition`, `resolveGlobalImageFields`, `resolveImportedCustomPath`,
  `sharedCustomPath`
- `src/lib/freeze-content-week.ts` — `freezeSectionContentWeek`
- `src/lib/section-images.ts` — `getSectionImages` par type

Cas minimum à couvrir (ceux validés manuellement le 2026-09-08, à figer) :

| Cas | Attendu |
|---|---|
| défaut | `homepage/2026/wk36/fr/quickaccess-1` |
| chemin hérité de la section | `landing-pages/fille/campagne/fr/quickaccess-2` |
| chemin surchargé par l'item | `promo/soldes/fr/quickaccess-3` |
| hérité + global | `landing-pages/fille/campagne/quickaccess-4` |
| slashes à normaliser (`/promo/noel/`) | `promo/noel/fr/quickaccess-5` |
| toggle actif mais aucun chemin nulle part | retombe sur le défaut |
| aller-retour export → import | mêmes champs reconstruits |

**Réalisé :** Vitest 3 + `vitest.config.ts` (alias `@`, environnement node),
scripts `npm run test` / `test:watch`, **64 tests** répartis en 4 fichiers
(`cms-image-path`, `parse-cms-html`, `freeze-content-week`, `section-images`).
Tous les cas du tableau ci-dessus sont couverts, y compris l'aller-retour
export → import. Ces tests ont ensuite servi de filet au refactor de la phase 1
(64/64 toujours verts après).

### Phase 1 — Registre de templates ✅ fait le 2026-09-09

Créer `src/templates/registry.ts` exposant un objet clé = type de section :

```
TEMPLATES[type] = {
  label,
  createEmptyContent,
  normalizeContent,   // cf. phase 2
  generateHTML,
  getImages,
  freezeWeek,
  Editor,
  Preview,
  validate,
}
```

Puis supprimer les cascades `if/else` des 6 fichiers listés plus haut, qui deviennent une
lecture dans le registre.

**Le point délicat :** les composants `Editor` n'ont pas tous la même signature de props
(certains reçoivent `items`, d'autres `content` ; MEA v2 a un `onOpenVideoUpload` en plus,
macarons a un `variant`). Uniformiser cette interface est le vrai travail de conception de
la phase — probablement une prop unique `{ content, ctx, onChange, onOpenMediaLibrary,
onDropFile }` avec les extras passés dans `ctx`.

Ne pas oublier : `macarons` et `macarons_v2` partagent le même éditeur et le même type
`MacaronItem` — le registre doit pouvoir pointer deux entrées vers le même composant avec
des options différentes.

**Réalisé :** `src/templates/registry.ts` déclare les 12 types avec
`createEmptyContent` / `normalizeContent` / `generateHTML` / `getImages` /
`freezeWeek`, et expose `createEmptySectionContent`, `generateSectionHTML`,
`getSectionImages`, `freezeSectionContentWeek`.

Cascades supprimées : route d'export HTML, route de création de section,
collecte d'images, gel de semaine. La collecte d'images vit maintenant dans
chaque template (`src/templates/<nom>/images.ts`) ; `src/lib/section-images.ts`
ne garde que le type `ImageEntry` et le helper `withPosition`, et
`src/lib/freeze-content-week.ts` devient une bibliothèque de comportements
(3 génériques + 3 spécifiques) que le registre référence par nom.

**Exception assumée :** `src/lib/section-labels.ts` reste à part. C'est une
table de libellés sans logique de dispatch, importée par deux composants
client — la faire passer par le registre tirerait tous les `export.ts` et
leurs blocs CSS dans le bundle client sans contrepartie.

**Vérifié :** 64/64 tests verts après refactor, typecheck et lint propres,
`npm run build` réussi, et contrôle en conditions réelles sur un brief jetable
(créé puis supprimé) — contenus par défaut identiques à l'ancienne cascade
(MEA v2 = 4 cartes, carousel = 2 slides, ariane = links/title/comment), HTML et
ZIP identiques sur les 5 cas de chemin, duplication en semaine 40 figeant
correctement les 5 items.

**Reste à faire (phase 3) :** la cascade éditeur/aperçu de `page.tsx` — elle
demande un registre UI séparé, avec des composants React et des props à
uniformiser.

### Phase 2 — Normalisation du contenu + conflit d'édition ✅ fait le 2026-09-09

Deux sujets indépendants mais qui touchent les mêmes fichiers que la phase 1.

**Normalisation.** Le `content` des sections est du JSON non validé (`as MacaronsContent`).
Les lignes créées avant l'ajout d'un champ ne l'ont pas, d'où les `?? false` éparpillés dans
les éditeurs et le bug Switch *uncontrolled → controlled* rencontré deux fois. Le pattern
existe déjà (`normalizeCustomContent`) mais n'est appliqué qu'à un seul template.
Le généraliser via `TEMPLATES[type].normalizeContent(content)` appliqué **à la lecture** :
fonction pure, coût runtime négligeable, un seul point d'appel.

**Conflit d'édition.** La sauvegarde écrase sans vérifier que personne n'a modifié entre
temps : deux personnes sur le même brief = perte silencieuse. Observé en conditions réelles
(un brief est passé de Brouillon à Publié pendant une session d'édition).
**Réalisé — normalisation.** `src/lib/normalize-content.ts` fournit `withDefaults` et
`withItemDefaults` ; chaque schéma concerné expose son normaliseur
(`normalizeMacaronsContent`, `normalizeMeaContent`, `normalizeMeaV2Content`, en plus du
`normalizeCustomContent` qui existait), branché dans le registre. La normalisation est
appliquée **côté serveur, dans les réponses d'API** (`GET /api/briefs/[id]`, et les
réponses POST/PUT de `/api/sections`) : tous les chemins qui alimentent l'état client sont
couverts, sans alourdir le bundle. La base se répare d'elle-même à la sauvegarde suivante.

Deux imbrications traitées explicitement, le spread étant superficiel : les boutons de
chaque carte, et l'`appelPrix` de la carte focus MEA v2 (un `appelPrix` partiel stocké
aurait sinon écrasé l'objet par défaut en entier).

Les `?? false` des éditeurs sont **volontairement conservés** : les retirer serait cosmétique
et rouvrirait un bug déjà rencontré deux fois si un chemin d'alimentation avait été oublié.
Ils sont désormais une ceinture-bretelles, plus la seule protection.

**Réalisé — conflit d'édition.** Le client envoie l'`updatedAt` chargé ; le serveur le
compare et répond 409 sans rien écraser. La comparaison se fait **en JS après un SELECT**,
pas dans un `WHERE` : les deux valeurs passent alors par la même conversion Drizzle vers
`Date`, alors qu'une comparaison directe à la colonne échouerait à tort — les lignes créées
par `defaultNow()` portent des microsecondes que le JSON du client a perdues. Le coût est
un SELECT par section sauvegardée (lookup sur clé primaire).

Côté client, `handleSave` **inspecte enfin les réponses** : `fetch` ne rejette pas sur un
statut d'erreur, si bien qu'une sauvegarde refusée s'affichait jusqu'ici comme réussie
(bug préexistant). Il rafraîchit aussi les `updatedAt` depuis les réponses, sans quoi la
sauvegarde suivante serait refusée à tort.

**Vérifié :** 74 tests (10 nouveaux sur la normalisation), et en conditions réelles —
session A enregistre (200), session B avec un `updatedAt` périmé est refusée (409, contenu
de A préservé), B repasse après rechargement (200) ; deux sauvegardes successives dans
l'UI passent toutes les deux ; un brief existant se charge sans être marqué « non
sauvegardé » et ses anciens items reviennent complétés.

**Limite connue :** les sections sont sauvegardées une par une. Si l'une est en conflit et
une autre non, la seconde est déjà écrite quand l'erreur s'affiche. Un endpoint de
sauvegarde groupée transactionnel serait le vrai correctif ; en pratique deux personnes qui
éditent des sections différentes ne se gênent pas, et le message invite à recharger.

### Phase 3 — Décomposition de `page.tsx` (1 j) — 🟡 à moitié fait le 2026-09-09

Le fichier dépasse 1 400 lignes et mélange orchestration des sections, médiathèque, upload,
drag & drop et garde de sauvegarde. La phase 1 en supprime déjà la plus grosse part
(les branches éditeur et preview). Reste :

1. **Extraire l'état en hooks** :
   - `useBriefSections(briefId)` — sections, `updateSection`, `updateSectionItems`, `dirty`,
     `handleSave`, `savedSectionsRef`
   - `useMediaTarget()` — `mediaTarget`, `uploadAssetType`, `handleDirectDrop`
   - `useUnsavedGuard(dirty)` — raccourci Ctrl+S et garde de navigation
2. **Découper la vue** : `<BriefHeader>` (titre, statut, Publier/Exporter/Sauvegarder),
   `<BriefEditorPanel>`, `<BriefPreviewPanel>`

**Fait — le registre UI.** `src/templates/registry-ui.tsx` associe à chaque type son
éditeur et son aperçu. Les éditeurs n'ayant pas la même signature (certains reçoivent
`items`, d'autres `content` ; MEA v2 et carousel ont un upload vidéo ; macarons a une
variante v1/v2), chaque entrée est un **adaptateur** qui traduit des props uniformes vers
celles du composant — aucun éditeur n'a été réécrit. La correspondance
« emplacement visé → type d'asset » (`cat_banner_desktop`, `carousel_title`,
`mea_v2_focus`...), auparavant dispersée dans `page.tsx`, y est maintenant regroupée.

Les deux cascades du rendu ont disparu : 212 lignes pour l'éditeur et 130 pour l'aperçu,
remplacées par `renderSectionEditor` / `renderSectionPreview`. `updateSectionItems` est
devenu inutile (la fusion items/réglages de section est faite par l'adaptateur).
**`page.tsx` passe de 1 508 à 1 164 lignes.**

**Vérifié :** 74 tests verts, typecheck, lint et build propres, et en conditions réelles sur
un brief jetable contenant **les 12 types de section** — tous rendus, aucun fallback
« non pris en charge », les deux champs de chemin de section et boutons d'import présents.
Test fonctionnel du point le plus risqué (la fusion de l'adaptateur) : renseigner le chemin
de section *puis* ajouter un item, sauvegarder — les deux sont bien persistés ensemble.

**Fait — le hook `useBriefSections`** (`use-brief-sections.ts`, 211 lignes) : chargement du
brief, état des sections, drapeau « non sauvegardé », enregistrement (avec le garde-fou 409
et le rafraîchissement des `updatedAt`), raccourci Ctrl+S et `beforeunload`.

Le drapeau se calculait à la main en quatre endroits (`serializeSections(next) !==
savedSectionsRef.current`), avec le risque qu'un futur `setSections` direct l'oublie et
fasse perdre du travail sans avertissement. Le hook expose `applySections` /
`updateSection`, seuls chemins de modification, et le calcul n'existe plus qu'une fois.

Simplification au passage : les sections dépliées et les aperçus visibles n'ont plus besoin
d'être amorcés au chargement du brief — les maps ne retiennent que les choix explicites de
l'utilisateur, avec un `?? true` à la lecture. **`page.tsx` : 1 508 → 1 030 lignes.**

**Vérifié en conditions réelles** sur un brief jetable : section dépliée par défaut, brief
non marqué « non sauvegardé » au chargement, drapeau qui s'allume à la première
modification, deux sauvegardes successives qui passent (donc pas de faux 409), contenu
réellement persisté, et dialogue « Modifications non sauvegardées » qui bloque bien le
retour au dashboard.

**Reste à faire :** le découpage de la vue en `<BriefHeader>` / `<BriefEditorPanel>` /
`<BriefPreviewPanel>` (surtout cosmétique désormais), et `handleImageSelected` qui porte
encore une cascade par type — prochain candidat naturel pour le registre UI.

### Phase 4 — Aperçu du chemin final ✅ fait le 2026-09-09

Un item porte maintenant : semaine (native/figée) × global (oui/non) × chemin custom
(aucun/section/item) × nom de fichier (auto/custom). Chaque réglage est simple isolément,
la combinaison ne l'est plus pour un utilisateur non technique.

Afficher **dans le bloc `WeekField`, sous les deux toggles**, une ligne en lecture seule avec
le chemin réellement exporté, en monospace discret, tronquée avec le chemin complet en `title`.

**Règle d'affichage :** uniquement quand l'item dévie du défaut (Global actif, chemin custom
actif, ou semaine ≠ celle du brief). Dans le cas normal la ligne reste masquée — neuf lignes
identiques seraient du bruit.

**Réalisé, avec une simplification par rapport au plan initial :** la ligne affiche le
**dossier** résolu (`→ homepage/2026/wk32/fr/`) et non le chemin de fichier complet.
Toute la combinatoire que l'utilisateur doit comprendre vit dans le dossier ; le nom de
fichier, lui, aurait obligé à recopier la règle de numérotation (`quickaccess-{position}`)
dans l'éditeur — une troisième copie de la logique que la phase 1 venait justement
d'éliminer. Le dossier passe par `resolveCmsFolder`, le même résolveur que l'export.

`WeekField` reçoit désormais `briefYear` et `briefLocale` (fournis en cascade depuis
`page.tsx`) et applique `cmsLocalePath` pour afficher la locale telle qu'elle sera écrite
dans le chemin.

**Vérifié en navigateur :** sur un brief réel, les items en semaine 32 (≠ 36 du brief)
affichent `→ homepage/2026/wk32/fr/`, les items en semaine 36 n'affichent rien, et activer
« Global » fait disparaître le segment de langue en direct.

### Phase 5 — Performance de l'export ZIP — 🟡 en partie fait le 2026-09-09

`src/lib/build-zip.ts`, par rapport valeur/effort décroissant :

1. **Décoder une seule fois** — `sharp(buffer)` est instancié deux fois par image (jpg puis
   webp). Un seul `sharp()` puis `.clone()` pour les deux sorties divise le coût CPU par deux.
   Changement de 3 lignes.
2. **Paralléliser** — la boucle est séquentielle. Traiter 4 à 6 images en parallèle (sharp
   travaille dans un threadpool natif et rend la main) : gain réel de 3-4× sur un export de
   30 images.
3. **Streamer la réponse** — tout le zip est assemblé en RAM (`chunks` + `Buffer.concat`)
   avant envoi, ce qui plafonne l'export groupé et les vidéos. Renvoyer le `PassThrough`
   directement comme corps de réponse supprime ce plafond, et rend caduque la crainte de
   deadlock documentée dans le fichier (le client devient le drain).

Garde-fou à prévoir : plafonner le nombre d'images par requête, ou découper l'export groupé
par brief.

**Fait — décodage unique et parallélisation.** `build-zip.ts` a été restructuré :
`prepareImage()` isole « télécharger + convertir » par image, un seul `sharp()` sert aux
deux sorties via `.clone()`, et les images sont préparées par lots de 4 en parallèle puis
ajoutées à l'archive dans l'ordre du lot (le zip reste déterministe).

⚠️ **Aucun chiffre de gain n'a pu être mesuré de façon fiable** : pendant les mesures, le
`fetch` de Node vers Vercel Blob s'est mis à échouer systématiquement (voir ci-dessous),
rendant les temps ininterprétables. La comparaison avant/après reste à refaire quand le
stockage répond.

**Fait — et non prévu : les échecs ne sont plus silencieux.** Le diagnostic a révélé un
défaut plus grave que la lenteur : quand `readAsset` échoue, l'image était simplement
loguée et sautée, et la route renvoyait **HTTP 200 avec une archive vide**. Un incident
passager du stockage livrait donc un brief sans images, sans le moindre avertissement —
découvert seulement une fois intégré au CMS.

Désormais `buildZipBuffer` renvoie `{ buffer, failed }` et :
- si **toutes** les images échouent → `502` avec un message explicite et la liste ;
- si **certaines** échouent → l'archive est livrée (elle reste utile), avec l'en-tête
  `X-Export-Images-Manquantes` et un fichier `_IMAGES-MANQUANTES.txt` à la racine du zip
  listant les visuels absents.

Vérifié sur les deux cas : 502 quand rien ne passe ; et 2 images sur 3 livrées avec
l'en-tête à `1` et le fichier de rapport présent.

**Reste à faire — le streaming de la réponse.** L'archive est toujours assemblée
entièrement en mémoire (`chunks` + `Buffer.concat`), ce qui plafonne l'export groupé et
les vidéos. C'est le point le plus délicat du fichier (cf. le deadlock documenté en tête),
à traiter séparément.

### Phase 6 — Upload direct vers Vercel Blob (1 j)

Aujourd'hui les fichiers transitent en base64 par la fonction serveur, d'où le
`proxyClientMaxBodySize: "1400mb"` de `next.config.ts` et +33 % de volume dû au base64.

Passer à l'upload direct (`@vercel/blob/client` + une petite route qui signe un token) :
les octets vont du navigateur au blob sans traverser la fonction.

**Contrainte à traiter :** la conversion TIFF a besoin du fichier côté serveur. Le flux
devient « upload puis conversion sur le blob stocké » au lieu de « conversion dans le corps
de la requête ». Un peu plus de pièces mobiles, mais c'est la seule façon de sortir de la
limite de 1,4 Go.

### Phase 7 — Dashboard : recherche + affichage progressif ✅ fait le 2026-09-09

**État constaté** dans `src/components/briefs/briefs-list.tsx` :

- les filtres langue/statut sont **côté serveur** (passés en query params à `/api/briefs`)
- le tri est **côté client**, sur l'ensemble des briefs chargés
- il n'y a **aucun champ de recherche**
- il n'y a **aucune pagination** : `sortedBriefs.map(...)` rend toutes les lignes

Exigences : afficher ~10 briefs puis « charger plus », mais la **recherche et le tri doivent
porter sur la totalité des briefs**, pas seulement sur les lignes visibles.

**Approche retenue — plafonner le rendu, pas le chargement.** Une ligne de brief ne contient
que des métadonnées (id, slug, nom, année, semaine, langue, statut, dates) : ~200 octets.
450 briefs ≈ 90 Ko, 5 ans ≈ 110 Ko. Charger l'ensemble reste négligeable, et cela satisfait
les deux exigences **par construction** : recherche et tri travaillent sur un tableau complet
en mémoire, donc ils couvrent forcément tout.

Concrètement :

1. Un seul `GET /api/briefs` au montage (on peut même retirer les params langue/statut :
   filtrer en mémoire rend les listes déroulantes instantanées et supprime un refetch)
2. Ajouter un champ de recherche (nom + slug), filtré en mémoire
3. Le tri existant ne change pas — il porte déjà sur l'ensemble
4. Ne rendre que les 10 premiers résultats + bouton « Charger plus » (+10)
5. Remettre le compteur à 10 dès qu'un filtre, la recherche ou le tri change

Coût : ~20 lignes, aucun changement d'API.

**Pourquoi pas de pagination serveur maintenant :** elle obligerait à porter recherche, tri
et offset en SQL (whitelist de colonnes de tri, `ILIKE` sur nom+slug, debounce sur la saisie,
refetch à chaque clic de tri, gestion des courses au « charger plus »). C'est le bon choix
au-delà de ~1 000-2 000 briefs, pas à 450.
**Bascule à envisager si** la charge utile initiale dépasse ~500 Ko ou si le dashboard devient
lent au chargement. La purge de rétention (phase 8) rognera de toute façon le total avant.

**Réalisé** dans `src/components/briefs/briefs-list.tsx` : un seul `GET /api/briefs` au
montage, filtres langue/statut passés côté client (donc instantanés, sans refetch),
champ de recherche sur le nom et le slug, rendu plafonné à 10 avec « Charger plus » (+10)
et un compteur « X sur N briefs ». Le compteur repart à 10 dès qu'un filtre, la recherche
ou le tri change — ajusté pendant le rendu et non dans un effet, pour éviter les rendus
en cascade que la règle `react-hooks/set-state-in-effect` interdit. « Tout sélectionner »
porte sur la liste filtrée, pas seulement sur les lignes visibles.

**Vérifié en conditions réelles** avec 15 briefs : 10 lignes affichées puis « Charger
plus » révèle les 15 et le bouton disparaît ; et surtout, un brief **absent des 10 lignes
visibles** est bien trouvé par la recherche, et le tri par semaine réordonne sur
l'ensemble — c'était l'exigence.

### Phase 8 — Purge de rétention automatique (0,5 j)

**État constaté :** il n'y a **pas de `vercel.json`**, donc **aucun cron n'est configuré**.
La purge est exclusivement manuelle. La mécanique est déjà propre :
`GET /api/retention/purge` = dry-run (`computePurgePreview`), `POST` = exécution
(`executePurge`), et la durée de conservation est un réglage (`getRetentionMonths`).

**Le toggle ne coûte rien :** la table `settings` est un key/value JSONB
(`key` / `value` / `updated_at`). Ajouter `autoPurgeEnabled` suit exactement le motif déjà
en place dans `src/app/api/settings/route.ts` (~15 lignes, validation comprise) et ne demande
**aucune migration**.

Mise en œuvre :

1. Réglage `autoPurgeEnabled` (booléen) + toggle dans l'onglet Paramétrage
2. `vercel.json` déclarant un cron quotidien vers une route dédiée
3. La route lit le réglage : si désactivé → ne fait rien et le dit ; sinon → `executePurge`
4. Le bouton manuel reste tel quel — c'est la porte de sortie et le moyen de faire un dry-run

**Piège à ne pas rater :** `src/proxy.ts` protège **toutes** les routes sauf `/login`,
`/api/auth` et `/api/preview/cms-css`. Un cron Vercel n'envoie aucun cookie `bb_session` :
il serait redirigé vers `/login` et **la purge ne tournerait jamais, silencieusement**.
La route de cron doit donc être ajoutée aux chemins publics et protégée par un secret
(`CRON_SECRET` en en-tête, vérifié dans la route).

**Observabilité :** il n'existe aucune table de log de purge. Comme la roadmap produit signale
déjà le risque (« dette data si la rétention est ajoutée sans observabilité »), une purge qui
tourne toute seule sans trace serait un mauvais échange. Version minimale et sans migration :
stocker le résultat de la dernière purge dans `settings` (clé `lastPurgeResult` : date, nombre
de briefs et d'assets supprimés) et l'afficher dans l'onglet Paramétrage. Une vraie table
`purge_logs` si le besoin d'historique se précise.

**Urgence :** dépend de la durée de conservation configurée. Si elle est de 2 ans (valeur
évoquée dans la roadmap produit), rien n'expire avant un moment et le cron peut attendre.

---

## Volume de données : vérifié, non bloquant

À 2-4 briefs/semaine toute l'année : ~150 briefs/an, ~800 sections/an, soit ~4 000 lignes
sur 5 ans. Trois ordres de grandeur sous le seuil où Postgres devient un sujet. **Rien à
faire côté base**, hors index de confort sur `briefSections.briefId` et `assets(year, week, type)`.

Ce qui s'accumule réellement : **les assets** (~30 images par brief → ~4 500 fichiers/an dans
Vercel Blob, plus les vidéos), et ça ne décroît jamais tout seul. Les routes
`/api/retention/purge` et `purge-videos` existent déjà, mais **uniquement en déclenchement
manuel** — c'est l'objet de la phase 8.

Effet secondaire du volume, côté UX et non perf : à ~450 briefs le dashboard devient pénible
à parcourir, et il n'a aujourd'hui ni recherche ni pagination — c'est l'objet de la phase 7.

---

## Écarté sciemment

Consigné pour éviter que ce soit reproposé plus tard.

| Sujet | Raison |
|---|---|
| Signature du cookie de session | Application interne, exposition jugée acceptable. `src/proxy.ts` ne vérifie que la présence du cookie `bb_session`, sans signature ni expiration : n'importe quelle valeur passe. À rouvrir **si l'app devient accessible hors réseau interne**. |
| Validation bloquante avant publication | Le statut « publié » est purement visuel pour les utilisateurs, il ne déclenche rien. |
| Historique des publications | Pas de besoin exprimé. |
| Diff entre deux briefs | Jugé sans valeur d'usage. |

---

## Séquencement recommandé

| Phase | État | Effort | Dépend de | Déclencheur |
|---|---|---|---|---|
| 0 — Tests fonctions pures | ✅ fait | 0,5 j | — | — |
| 1 — Registre de templates | ✅ fait | 1 j | 0 | prérequis du P1 produit |
| 2 — Normalisation + 409 | ✅ fait | 0,5 j | 1 | — |
| 4 — Aperçu du chemin | ✅ fait | 0,5 j | 1 | — |
| 3 — Découpage `page.tsx` | 🟡 registre UI + hook faits ; découpage de la vue à faire | 0,25 j restant | 1 | — |
| 5 — Perf ZIP | 🟡 parallélisation + échecs remontés ; streaming à faire | 0,25 j restant | — | — |
| 6 — Upload direct Blob | à faire | 1 j | — | si un upload dépasse la limite |
| 7 — Dashboard recherche + « charger plus » | ✅ fait | 0,5 j | — | — |
| 8 — Purge automatique | à faire | 0,5 j | — | avant la fin de la 1re fenêtre de rétention |

**Reste ~3,5 jours.** Les phases 5 à 8 sont indépendantes et s'intercalent au moment où
leur déclencheur se présente.

Prochaine étape naturelle : la phase 3, qui s'appuie sur le registre — il faut d'abord un
registre UI (`registry-ui.tsx`, séparé pour ne pas tirer les composants React dans les
bundles serveur) avec des props d'éditeur uniformisées, puis l'extraction des hooks.
