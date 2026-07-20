import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Le proxy (src/proxy.ts) buffer le corps des requêtes avec une limite
    // par défaut de 10 Mo — trop bas pour l'upload vidéo MEA v2 (base64
    // gonfle la taille d'environ 33%). Alignée sur MAX_VIDEO_SOURCE_BYTES
    // (40 Mo, src/lib/upload-specs.ts) + marge pour l'encodage base64.
    proxyClientMaxBodySize: "60mb",
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
