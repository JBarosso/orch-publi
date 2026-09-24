// Bascule des vidéos vers le mode « URL » : l'outil ne les héberge plus.
//
//   node video-migration.mjs           -> liste seulement, n'écrit rien
//   node video-migration.mjs --apply   -> vide les adresses devenues mortes,
//                                          supprime les fichiers et la médiathèque
import { list, del } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))[1];
const token = get("BLOB_READ_WRITE_TOKEN");
const sql = neon(get("DATABASE_URL"));

const isHosted = (url) => typeof url === "string" && url.includes(".public.blob.vercel-storage.com");
const mb = (b) => (b / 1048576).toFixed(1) + " Mo";

// 1. Sections dont la vidéo pointe vers notre stockage : l'adresse ne vaudra
//    plus rien une fois le fichier supprimé, on la vide pour qu'elle soit
//    ressaisie (la page Export affiche alors « adresse non renseignée »).
const sections = await sql`
  select s.id, s.title, s.type, s.content, b.name as brief, b.week, b.locale
  from brief_sections s join briefs b on b.id = s.brief_id
  where s.type in ('carousel', 'mea_v2')`;

const touched = [];
for (const s of sections) {
  const content = s.content ?? {};
  let changed = false;

  if (s.type === "carousel") {
    const slides = (content.slides ?? []).map((slide, i) => {
      if (!isHosted(slide?.videoUrl)) return slide;
      changed = true;
      touched.push({ ...s, slot: `diapositive ${i + 1}`, url: slide.videoUrl });
      return { ...slide, videoUrl: "" };
    });
    if (changed) content.slides = slides;
  } else if (isHosted(content.focus?.videoUrl)) {
    changed = true;
    touched.push({ ...s, slot: "carte focus", url: content.focus.videoUrl });
    content.focus = { ...content.focus, videoUrl: "" };
  }

  if (changed && APPLY) {
    await sql`update brief_sections set content = ${JSON.stringify(content)}::jsonb where id = ${s.id}`;
  }
}

console.log(`Sections à ressaisir (${touched.length}) :`);
for (const t of touched) {
  console.log(`  ${t.brief} (S${t.week} ${t.locale}) — ${t.title} — ${t.slot}`);
  console.log(`      ancien fichier : ${t.url.split("/").pop()}`);
}

// 2. Fichiers vidéo du stockage et entrées de médiathèque correspondantes.
const videoAssets = await sql`select id, url, label from assets where mime_type like 'video/%'`;
let cursor, blobs = [];
do {
  const page = await list({ token, cursor, limit: 1000 });
  blobs.push(...page.blobs);
  cursor = page.cursor;
} while (cursor);
const videoBlobs = blobs.filter((b) => b.pathname.endsWith(".mp4"));

console.log(`\nFichiers vidéo : ${videoBlobs.length} (${mb(videoBlobs.reduce((n, b) => n + b.size, 0))})`);
console.log(`Entrées de médiathèque : ${videoAssets.length}`);

if (!APPLY) {
  console.log("\nLecture seule — relancer avec --apply pour appliquer.");
} else {
  if (videoBlobs.length) await del(videoBlobs.map((b) => b.url), { token });
  if (videoAssets.length) {
    await sql`delete from assets where mime_type like 'video/%'`;
  }
  console.log("\nAppliqué : adresses vidées, fichiers et entrées supprimés.");
}
