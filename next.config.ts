import type { NextConfig } from "next";
// @ts-expect-error - No types available for this plugin
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  turbopack: {
    // Enable turbopack with empty config to suppress the warning
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
