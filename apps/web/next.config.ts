import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@achouse/db", "@achouse/types"],
  experimental: {
    serverComponentsHmrCache: true,
  },
  // Allow images from external sources if needed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.clerk.com",
      },
    ],
  },
};

export default nextConfig;
