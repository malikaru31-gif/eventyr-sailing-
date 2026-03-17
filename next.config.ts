import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ENABLE_DEV_GATE: process.env.ENABLE_DEV_GATE,
  },
};

export default nextConfig;
