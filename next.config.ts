import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: `${Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20) + 2}mb`,
    },
  },
};

export default nextConfig;
