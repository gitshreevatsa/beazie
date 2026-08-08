import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @inco/lightning-js ships modern ESM/viem code; let Next transpile it.
  transpilePackages: ["@inco/lightning-js"],
  // Pin the workspace root to this app (silences the multi-lockfile warning).
  turbopack: {
    root: path.resolve("."),
  },
};

export default nextConfig;
