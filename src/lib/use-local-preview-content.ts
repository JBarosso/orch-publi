"use client";

import { useEffect, useMemo, useState } from "react";
import { LOCAL_IMAGE_PREFIX } from "@/lib/local-images";

// Les aperçus sont des iframes isolées (sandbox, origine opaque) : le service
// worker ne les couvre pas, et elles ne peuvent charger ni /local-images/…
// ni une adresse blob: de la page. Seule une adresse data: y passe (vérifié
// dans Chrome). On remplace donc chaque image locale par sa version data:
// avant de construire l'aperçu. Une image locale ne change jamais une fois
// créée (nouvel id à chaque upload) : le cache n'a pas besoin d'être vidé.
const LOCAL_URL_RE = new RegExp(`${LOCAL_IMAGE_PREFIX.replace(/\//g, "\\/")}[^"\\\\]+`, "g");
const cache = new Map<string, string>();

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function load(url: string): Promise<void> {
  if (cache.has(url)) return;
  // Servie par le service worker, ou par l'image de remplacement si elle
  // n'est pas sur ce poste : dans les deux cas, l'aperçu montre quelque chose.
  const res = await fetch(url);
  cache.set(url, await toDataUrl(await res.blob()));
}

/** Contenu de section prêt pour un aperçu en iframe : images locales en data:. */
export function useLocalPreviewContent(content: unknown): unknown {
  const json = JSON.stringify(content ?? null);
  const missingKey = [...new Set(json.match(LOCAL_URL_RE) ?? [])].filter((url) => !cache.has(url)).join("\n");
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    Promise.allSettled(missingKey.split("\n").map(load)).then(() => {
      if (!cancelled) setLoaded((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // Même objet tant que le contenu ne change pas : l'aperçu ne se reconstruit
  // pas quand on modifie une autre section du brief.
  return useMemo(() => {
    if (!json.includes(LOCAL_IMAGE_PREFIX)) return content;
    return JSON.parse(json.replace(LOCAL_URL_RE, (url) => cache.get(url) ?? url));
    // `loaded` : recalcul quand le cache vient de se remplir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, loaded]);
}
