import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Recopiées dans le code du navigateur à la construction : Sentry y en a besoin (un DSN n'est pas un secret).
  env: {
    SENTRY_DSN: process.env.SENTRY_DSN ?? "",
    VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  partialPrefetching: true,
  experimental: {
    // Pièces jointes : 4 Mo de PDF plus le formulaire (1 Mo par défaut ; Vercel plafonne de toute façon à 4,5 Mo).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
