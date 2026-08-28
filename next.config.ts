import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.danubehome.com" },
      { protocol: "https", hostname: "**.homecentre.com" },
      { protocol: "https", hostname: "**.panemirates.com" },
      { protocol: "https", hostname: "**.panhomestores.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.shopprix.com" },
      { protocol: "https", hostname: "**.landmarkgroup.com" },
      { protocol: "https", hostname: "oaidalle1.blob.core.windows.net" },
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
