import type { NextConfig } from "next";

// Configuration Static Site Generation (SSG) for Next.js
const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
