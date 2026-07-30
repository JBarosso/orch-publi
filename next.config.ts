import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Le proxy (src/proxy.ts) buffer le corps des requêtes avec une limite
    // par défaut de 10 Mo — trop bas pour l'upload vidéo MEA v2 (base64
    // gonfle la taille d'environ 33%) et surtout pour l'upload TIFF (plafond
    // volontairement haut, cf. MAX_TIFF_SOURCE_BYTES dans upload-specs.ts —
    // 1 Go + marge base64, arrondi à 1400 Mo).
    proxyClientMaxBodySize: "1400mb",
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
