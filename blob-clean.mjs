// Script ponctuel : supprime les PNG temporaires de plus de 24 h (tmp/) et les
// vidéos MP4 orphelines (ni en médiathèque, ni dans un brief ou un template).
import { list, del } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))[1];
const token = get("BLOB_READ_WRITE_TOKEN");
const sql = neon(get("DATABASE_URL"));
const mb = (b) => (b / 1048576).toFixed(1) + " Mo";
const listAll = async () => {
  let cursor, all = [];
  do {
    const r = await list({ token, cursor, limit: 1000 });
    all.push(...r.blobs);
    cursor = r.cursor;
  } while (cursor);
  return all;
};

const all = await listAll();
const known = new Set((await sql`select url from assets`).map((a) => a.url));
const refs =
  (await sql`select content::text as c from brief_sections`).map((s) => s.c).join("\n") +
  (await sql`select coalesce(string_agg(t::text, ' '), '') as c from custom_templates t`)[0].c;
const cutoff = Date.now() - 24 * 3600e3;

const staleTmp = all.filter((b) => b.pathname.startsWith("tmp/") && b.uploadedAt.getTime() < cutoff);
const orphanVideos = all.filter(
  (b) => !b.pathname.startsWith("tmp/") && b.pathname.endsWith(".mp4") && !known.has(b.url),
);
const targets = [...staleTmp, ...orphanVideos].filter((b) => !refs.includes(b.url));

console.log(`PNG temporaires : ${staleTmp.length} (${mb(staleTmp.reduce((s, b) => s + b.size, 0))})`);
console.log(`Vidéos orphelines : ${orphanVideos.length} (${mb(orphanVideos.reduce((s, b) => s + b.size, 0))})`);
if (targets.length) await del(targets.map((b) => b.url), { token });

const after = await listAll();
console.log(
  `Store : ${mb(all.reduce((s, b) => s + b.size, 0))} -> ${mb(after.reduce((s, b) => s + b.size, 0))} (${all.length} -> ${after.length} fichiers)`,
);
