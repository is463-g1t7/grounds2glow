import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    // The simulated tools moved under /demo so they can't be mistaken for the live station.
    return [
      { source: "/scan", destination: "/demo/scan", permanent: true },
      { source: "/ocr", destination: "/demo/ocr", permanent: true },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
