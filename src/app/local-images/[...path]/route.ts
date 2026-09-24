import { LOCAL_IMAGE_MISSING_HEADER } from "@/lib/local-images";

// Une image du mode local n'existe que dans le navigateur qui l'a créée : le
// service worker (public/local-images-sw.js) la sert directement, et cette
// route n'est atteinte que quand il ne l'a pas — brief ouvert sur un autre
// poste, base du navigateur vidée. Plutôt qu'une image cassée, on explique.
// Code 200 pour qu'elle s'affiche ; l'en-tête permet à l'export de la
// distinguer d'une vraie image et de la signaler comme manquante.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#fef3c7"/>
  <rect x="8" y="8" width="584" height="384" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="14 10"/>
  <text x="300" y="185" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="#92400e">Image locale</text>
  <text x="300" y="230" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" fill="#92400e">disponible uniquement sur le poste qui l'a créée</text>
</svg>`;

export function GET() {
  return new Response(PLACEHOLDER, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
      [LOCAL_IMAGE_MISSING_HEADER]: "1",
    },
  });
}
