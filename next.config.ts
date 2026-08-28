import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.danubehome.com" },
      { protocol: "https", hostname: "www.homecentre.com" },
      { protocol: "https", hostname: "m.homecentre.com" },
      { protocol: "https", hostname: "www.panemirates.com" },
      { protocol: "https", hostname: "www.panhomestores.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "http", hostname: "localhost" },
    ],
    dangerouslyAllowSVG: true,
  },
  serverExternalPackages: ["better-sqlite3"],
};


export default nextConfig;
