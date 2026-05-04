import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webConfigDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(webConfigDir, "../..")
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos"
      }
    ]
  }
};

export default nextConfig;
