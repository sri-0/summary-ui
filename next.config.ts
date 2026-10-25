import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The dev indicator sits bottom right with the other dev tools: the sidebar footer (the theme toggle) is bottom left and dialog actions are top right.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // The radix-ui umbrella otherwise compiles all 35 primitives.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
