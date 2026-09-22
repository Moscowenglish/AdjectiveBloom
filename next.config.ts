import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/adjectivebloom",
  assetPrefix: "/adjectivebloom",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
