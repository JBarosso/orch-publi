import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests unitaires des fonctions pures (chemins CMS, parsing d'import, figeage
// de semaine, collecte des images). Environnement node : aucune de ces
// fonctions ne touche au DOM — parseHtmlFragment, qui utilise DOMParser, est
// volontairement hors périmètre et testé via le navigateur.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
