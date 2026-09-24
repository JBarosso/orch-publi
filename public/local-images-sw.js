// Sert les images du mode local (/local-images/<id>.<ext>) depuis la base
// IndexedDB de ce navigateur, où src/lib/local-images.ts les range. Aucune
// autre requête n'est touchée. Une image absente du poste (brief ouvert
// ailleurs, base vidée) part vers le serveur, qui renvoie une image de
// remplacement (src/app/local-images/[...path]/route.ts).
//
// DB_NAME et STORE doivent rester identiques à ceux de local-images.ts.
const DB_NAME = "orch-publi-local";
const STORE = "images";
const PREFIX = "/local-images/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) {
    return;
  }
  event.respondWith(serve(event.request, url.pathname));
});

async function serve(request, pathname) {
  const id = pathname.slice(PREFIX.length).replace(/\.[^./]+$/, "");
  const record = await readRecord(id);
  if (!record) return fetch(request);
  return new Response(record.blob, {
    headers: { "Content-Type": record.mimeType, "Cache-Control": "no-store" },
  });
}

function readRecord(id) {
  return new Promise((resolve) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) {
        open.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      const db = open.result;
      const get = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      get.onsuccess = () => {
        resolve(get.result);
        db.close();
      };
      get.onerror = () => {
        resolve(undefined);
        db.close();
      };
    };
  });
}
