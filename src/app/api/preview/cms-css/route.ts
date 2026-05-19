import { CMS_CSS_URL } from "@/lib/cms-css";

const CACHE_MS = 60 * 60 * 1000;

let cached: { body: string; fetchedAt: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_MS) {
    return cssResponse(cached.body);
  }

  try {
    const upstream = await fetch(CMS_CSS_URL, {
      headers: { Accept: "text/css,*/*" },
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return new Response("/* Échec chargement global.css Orchestra */", {
        status: 502,
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    }

    const body = await upstream.text();
    cached = { body, fetchedAt: now };
    return cssResponse(body);
  } catch {
    return new Response("/* Erreur réseau global.css Orchestra */", {
      status: 502,
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }
}

function cssResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
