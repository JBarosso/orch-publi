## orch-publi

Outil interne pour préparer les briefs e-merch hebdomadaires et exporter leurs sections (HTML + images) vers le CMS Salesforce Commerce Cloud d'Orchestra.

- **Briefs** par semaine et par langue, composés de sections : quickaccess (macarons), MEA, slider, global header, fil d'ariane, edito, cat banner, img sous menu, miniature offre, moodboard, sections personnalisées.
- **Aperçu** de chaque section dans une iframe isolée, avec repère sur les éléments commentés.
- **Verrou d'édition** : un seul éditeur à la fois par brief, les autres le voient en lecture seule.
- **Médiathèque** : upload (glisser-déposer, recadrage, complétion des zones vides par IA), URL d'origine des images glissées depuis le web, vignettes vidéo.
- **Export** : code HTML à coller dans l'asset CMS indiqué, et ZIP d'images aux chemins CMS attendus.
- **Bibliothèques** réutilisables (global header, edito), **traductions**, **programmation**, **assets CMS** par page.

Les commentaires développeur ne sont jamais exportés.

---

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 · shadcn/ui (Base UI)
- Drizzle ORM · Neon Postgres
- Vercel (hébergement, Blob pour les fichiers, cron de purge)
- Vitest

---

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3010
```

Autres scripts : `npm run build`, `npm test`, `npm run lint`, `npm run db:push` (applique `src/lib/schema.ts` à la base — à lancer avant de déployer un changement de schéma), `npm run db:studio`.

### Variables d'environnement (`.env.local`)

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion Neon Postgres |
| `APP_PASSWORD` | Mot de passe de connexion à l'application |
| `BLOB_READ_WRITE_TOKEN` | Stockage des images et vidéos (Vercel Blob), obligatoire aussi en local |
| `CRON_SECRET` | Protège la route du cron de purge (prod) |

La clé OpenAI de la complétion d'image se saisit dans Paramétrage, pas en variable d'environnement.
